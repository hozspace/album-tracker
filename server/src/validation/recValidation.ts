import { ValidationError } from '../lib/validationError.js'
import type { RecsContextSeed } from '../lib/recsContext.js'
import type { RecStatus } from '../types/rec.js'

const GENERATE_ALLOWED_FIELDS = new Set(['seed'])
const SEED_ALLOWED_FIELDS = new Set(['genre', 'artist'])
const STATUS_ALLOWED_FIELDS = new Set(['status'])
const ALLOWED_STATUSES = new Set<RecStatus>(['logged', 'dismissed'])

export interface GenerateRecsBody {
  seed?: RecsContextSeed
}

export interface RecStatusBody {
  status: 'logged' | 'dismissed'
}

export function validateGenerateRecsBody(body: unknown): GenerateRecsBody {
  if (body === undefined) return {}

  const record = assertPlainObject(body)
  assertNoUnknownFields(record, GENERATE_ALLOWED_FIELDS)

  if (record.seed === undefined || record.seed === null) return {}

  const seedRecord = assertPlainObject(record.seed)
  assertNoUnknownFields(seedRecord, SEED_ALLOWED_FIELDS)

  const genre = parseOptionalNonEmptyString(seedRecord.genre, 'seed.genre')
  const artist = parseOptionalNonEmptyString(seedRecord.artist, 'seed.artist')

  if (!genre && !artist) return {}

  return { seed: { ...(genre ? { genre } : {}), ...(artist ? { artist } : {}) } }
}

export function validateRecStatusBody(body: unknown): RecStatusBody {
  const record = assertPlainObject(body)
  assertNoUnknownFields(record, STATUS_ALLOWED_FIELDS)

  if (typeof record.status !== 'string' || !ALLOWED_STATUSES.has(record.status as RecStatus)) {
    throw new ValidationError("status must be 'logged' or 'dismissed'")
  }

  return { status: record.status as RecStatusBody['status'] }
}

export function parseRecId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError('id must be a positive integer')
  }
  return Number(raw)
}

function assertPlainObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('request body must be a JSON object')
  }
  return body as Record<string, unknown>
}

function assertNoUnknownFields(record: Record<string, unknown>, allowed: Set<string>): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`unknown field: ${key}`)
    }
  }
}

function parseOptionalNonEmptyString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`)
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
