import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runMigrations } from '../migrations.js'
import * as logsRepository from '../repositories/logsRepository.js'
import { fakeArtResponse } from '../test/fakeArtResponse.js'
import { backfillArtCache, cacheArtForLog, isCacheableArtUrl } from './artCache.js'

function makeCreateInput(overrides: Partial<Parameters<typeof logsRepository.create>[1]> = {}) {
  return {
    mbid: null,
    title: 'Kid A',
    artist: 'Radiohead',
    year: 2000,
    artUrl: null,
    rating: 4,
    faveTrack: null,
    listenedOn: '2026-07-01',
    relisten: false,
    note: null,
    ...overrides,
  }
}

let db: Database.Database
let artDir: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  artDir = mkdtempSync(join(tmpdir(), 'art-backfill-test-'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(artDir, { recursive: true, force: true })
})

describe('isCacheableArtUrl', () => {
  it('allows https coverartarchive.org and archive.org urls', () => {
    expect(isCacheableArtUrl('https://coverartarchive.org/release-group/abc/front-250')).toBe(true)
    expect(isCacheableArtUrl('https://archive.org/download/abc/abc.jpg')).toBe(true)
  })

  it('rejects other hosts, http, and malformed urls', () => {
    expect(isCacheableArtUrl('https://evil.example.com/cover.jpg')).toBe(false)
    expect(isCacheableArtUrl('http://coverartarchive.org/release-group/abc/front-250')).toBe(false)
    expect(isCacheableArtUrl('not a url')).toBe(false)
  })
})

describe('backfillArtCache', () => {
  it('converts a log with an external artUrl to a local cached one', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(fakeArtResponse())
    vi.stubGlobal('fetch', fetchMock)
    const created = logsRepository.create(
      db,
      makeCreateInput({ artUrl: 'https://coverartarchive.org/release-group/xyz/front-250' }),
    )

    // Act
    await backfillArtCache(db, artDir)

    // Assert
    const updated = logsRepository.findById(db, created.id)
    expect(updated?.artUrl).toBe(`/api/art/${created.id}`)
    expect(existsSync(join(artDir, `${created.id}.jpg`))).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('leaves logs with a local or missing artUrl untouched', async () => {
    // Arrange
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    logsRepository.create(db, makeCreateInput({ artUrl: null }))
    logsRepository.create(db, makeCreateInput({ artUrl: '/api/art/1' }))

    // Act
    await backfillArtCache(db, artDir)

    // Assert
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('re-downloads art when a local artUrl has no file behind it and the log has an mbid', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(fakeArtResponse())
    vi.stubGlobal('fetch', fetchMock)
    const created = logsRepository.create(db, makeCreateInput({ mbid: 'xyz' }))
    logsRepository.update(db, created.id, { artUrl: `/api/art/${created.id}` })

    // Act
    await backfillArtCache(db, artDir)

    // Assert
    const repaired = logsRepository.findById(db, created.id)
    expect(repaired?.artUrl).toBe(`/api/art/${created.id}`)
    expect(existsSync(join(artDir, `${created.id}.jpg`))).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://coverartarchive.org/release-group/xyz/front-500',
      expect.anything(),
    )
  })

  it('logs and skips a log whose download fails, leaving its artUrl external', async () => {
    // Arrange
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const externalUrl = 'https://coverartarchive.org/release-group/xyz/front-250'
    const created = logsRepository.create(db, makeCreateInput({ artUrl: externalUrl }))

    // Act
    await backfillArtCache(db, artDir)

    // Assert
    const updated = logsRepository.findById(db, created.id)
    expect(updated?.artUrl).toBe(externalUrl)
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})

describe('cacheArtForLog mid-download races', () => {
  it('skips the write when the log was deleted while the download was in flight', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeArtResponse()))
    const created = logsRepository.create(
      db,
      makeCreateInput({ artUrl: 'https://coverartarchive.org/release-group/xyz/front-250' }),
    )
    logsRepository.remove(db, created.id)

    // Act
    await cacheArtForLog(db, artDir, created)

    // Assert
    expect(existsSync(join(artDir, `${created.id}.jpg`))).toBe(false)
  })

  it('skips the write when the log was repointed at different art mid-download', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeArtResponse()))
    const created = logsRepository.create(
      db,
      makeCreateInput({ artUrl: 'https://coverartarchive.org/release-group/old/front-250' }),
    )
    logsRepository.update(db, created.id, {
      artUrl: 'https://coverartarchive.org/release-group/new/front-250',
    })

    // Act: caching fires with the stale snapshot of the row
    await cacheArtForLog(db, artDir, created)

    // Assert: no file written, the newer artUrl untouched
    expect(existsSync(join(artDir, `${created.id}.jpg`))).toBe(false)
    expect(logsRepository.findById(db, created.id)?.artUrl).toBe(
      'https://coverartarchive.org/release-group/new/front-250',
    )
  })
})
