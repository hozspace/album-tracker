import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import * as logsRepository from '../repositories/logsRepository.js'
import type { Log } from '../types/log.js'

const DOWNLOAD_TIMEOUT_MS = 10_000
const MAX_ART_BYTES = 5 * 1024 * 1024
const BACKFILL_DELAY_MS = 250

// The client only ever produces coverartarchive.org URLs, which redirect to
// archive.org. Anything else is refused so we never fetch an arbitrary
// user-supplied host.
const ALLOWED_ART_HOSTS = new Set(['coverartarchive.org', 'archive.org'])

const EXTENSION_OVERRIDES: Record<string, string> = { jpeg: 'jpg' }
const CONTENT_TYPE_OVERRIDES: Record<string, string> = { jpg: 'image/jpeg' }

export interface DownloadedArt {
  buffer: Buffer
  extension: string
}

export function isCacheableArtUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === 'https:' && ALLOWED_ART_HOSTS.has(parsed.hostname)
}

export function artUrlForLog(logId: number): string {
  return `/api/art/${logId}`
}

export function findArtFile(artDir: string, logId: number): string | null {
  if (!existsSync(artDir)) return null
  const prefix = `${logId}.`
  const match = readdirSync(artDir).find((file) => file.startsWith(prefix))
  return match ? join(artDir, match) : null
}

export function contentTypeForExtension(extension: string): string {
  const normalized = extension.toLowerCase()
  return CONTENT_TYPE_OVERRIDES[normalized] ?? `image/${normalized}`
}

export function removeArtFile(artDir: string, logId: number): void {
  const existing = findArtFile(artDir, logId)
  if (!existing) return
  try {
    unlinkSync(existing)
  } catch (error) {
    console.error(`failed to remove cached art file for log ${logId}:`, error)
  }
}

export async function downloadArt(url: string): Promise<DownloadedArt> {
  if (!isCacheableArtUrl(url)) {
    throw new Error(`refusing to download art from disallowed url: ${url}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    if (!response.ok) {
      throw new Error(`art download failed with status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      throw new Error(`unexpected art content-type: ${contentType || 'unknown'}`)
    }

    const buffer = await readBodyWithLimit(response, MAX_ART_BYTES)
    return { buffer, extension: extensionForContentType(contentType) }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('art response has no body')
  }

  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`art download exceeded ${maxBytes} byte limit`)
    }
    chunks.push(value)
  }

  return Buffer.concat(chunks)
}

function extensionForContentType(contentType: string): string {
  const subtype = contentType.split(';')[0]?.split('/')[1]?.trim().toLowerCase() || 'jpg'
  return EXTENSION_OVERRIDES[subtype] ?? subtype
}

function saveArtFile(artDir: string, logId: number, art: DownloadedArt): void {
  mkdirSync(artDir, { recursive: true })
  removeArtFile(artDir, logId)
  // temp-write + rename so an interrupted write can't leave a partial file
  const finalPath = join(artDir, `${logId}.${art.extension}`)
  const tempPath = `${finalPath}.tmp`
  writeFileSync(tempPath, art.buffer)
  renameSync(tempPath, finalPath)
}

// Downloads and caches art for a log if its artUrl is an external, allowed
// URL. Never throws: failures are logged and the log's existing (external)
// artUrl is left untouched so a flaky download never loses data or fails the
// request that triggered it.
export async function cacheArtForLog(
  db: Database.Database,
  artDir: string,
  log: Log,
): Promise<void> {
  if (!log.artUrl || !isCacheableArtUrl(log.artUrl)) return

  try {
    const art = await downloadArt(log.artUrl)
    saveArtFile(artDir, log.id, art)
    logsRepository.update(db, log.id, { artUrl: artUrlForLog(log.id) })
  } catch (error) {
    console.error(`failed to cache art for log ${log.id} (${log.artUrl}):`, error)
  }
}

// Runs once at startup: finds logs still pointing at an external artUrl and
// caches them one at a time, with a short delay between downloads so we
// don't hammer the upstream host. Failures are logged and skipped.
export async function backfillArtCache(db: Database.Database, artDir: string): Promise<void> {
  repairMissingArtFiles(db, artDir)
  const pending = logsRepository.findWithExternalArtUrl(db)
  for (const [index, log] of pending.entries()) {
    await cacheArtForLog(db, artDir, log)
    const isLast = index === pending.length - 1
    if (!isLast) {
      await delay(BACKFILL_DELAY_MS)
    }
  }
}

// A row can point at /api/art/{id} with no file behind it (e.g. the process
// died between the row update and a durable file landing). When the log has
// an mbid we can rebuild the Cover Art Archive URL and let the normal
// backfill re-download it.
function repairMissingArtFiles(db: Database.Database, artDir: string): void {
  for (const log of logsRepository.findWithLocalArtUrl(db)) {
    if (findArtFile(artDir, log.id)) continue
    if (!log.mbid) {
      console.error(`log ${log.id} has local artUrl but no cached file and no mbid to re-fetch from`)
      continue
    }
    logsRepository.update(db, log.id, {
      artUrl: `https://coverartarchive.org/release-group/${log.mbid}/front-500`,
    })
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
