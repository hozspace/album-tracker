import { ValidationError } from '../lib/validationError.js'
import type { CreateLogInput, UpdateLogInput } from '../types/log.js'

const ALLOWED_FIELDS = new Set([
  'mbid',
  'title',
  'artist',
  'year',
  'artUrl',
  'rating',
  'faveTrack',
  'listenedOn',
  'relisten',
  'note',
])

const MAX_NOTE_LENGTH = 2000
const MIN_YEAR = 1900
const MAX_YEAR = 2100
const MIN_RATING = 0.5
const MAX_RATING = 5
const RATING_STEP_SCALE = 10
const RATING_STEP = 5

export interface ListLogsQuery {
  limit: number
  offset: number
}

export function validateCreateLog(body: unknown): CreateLogInput {
  const record = assertPlainObject(body)
  assertNoUnknownFields(record)

  return {
    title: parseRequiredString(record.title, 'title'),
    artist: parseRequiredString(record.artist, 'artist'),
    rating: parseRating(record.rating),
    listenedOn: parseListenedOn(record.listenedOn),
    mbid: parseOptionalString(record.mbid, 'mbid') ?? null,
    year: parseOptionalYear(record.year) ?? null,
    artUrl: parseOptionalString(record.artUrl, 'artUrl') ?? null,
    faveTrack: parseOptionalString(record.faveTrack, 'faveTrack') ?? null,
    relisten: parseOptionalBoolean(record.relisten, 'relisten') ?? false,
    note: parseOptionalNote(record.note) ?? null,
  }
}

export function validateUpdateLog(body: unknown): UpdateLogInput {
  const record = assertPlainObject(body)
  assertNoUnknownFields(record)

  const input: UpdateLogInput = {}

  if (record.title !== undefined) input.title = parseRequiredString(record.title, 'title')
  if (record.artist !== undefined) input.artist = parseRequiredString(record.artist, 'artist')
  if (record.rating !== undefined) input.rating = parseRating(record.rating)
  if (record.listenedOn !== undefined) input.listenedOn = parseListenedOn(record.listenedOn)
  if (record.mbid !== undefined) input.mbid = parseOptionalString(record.mbid, 'mbid') ?? null
  if (record.year !== undefined) input.year = parseOptionalYear(record.year) ?? null
  if (record.artUrl !== undefined) input.artUrl = parseOptionalString(record.artUrl, 'artUrl') ?? null
  if (record.faveTrack !== undefined)
    input.faveTrack = parseOptionalString(record.faveTrack, 'faveTrack') ?? null
  if (record.relisten !== undefined) input.relisten = parseOptionalBoolean(record.relisten, 'relisten')
  if (record.note !== undefined) input.note = parseOptionalNote(record.note) ?? null

  return input
}

export function validateListQuery(query: Record<string, unknown>): ListLogsQuery {
  return {
    limit: parseQueryInt(query.limit, 'limit', { fallback: 50, min: 1, max: 200 }),
    offset: parseQueryInt(query.offset, 'offset', { fallback: 0, min: 0, max: Number.MAX_SAFE_INTEGER }),
  }
}

export function parseLogId(raw: string): number {
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

function assertNoUnknownFields(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new ValidationError(`unknown field: ${key}`)
    }
  }
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required and must be a non-empty string`)
  }
  return value.trim()
}

function parseRating(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError('rating is required and must be a number')
  }
  if (value < MIN_RATING || value > MAX_RATING) {
    throw new ValidationError(`rating must be between ${MIN_RATING} and ${MAX_RATING}`)
  }
  const scaled = value * RATING_STEP_SCALE
  const isExactHalfStep =
    Math.abs(scaled - Math.round(scaled)) < 1e-9 && Math.round(scaled) % RATING_STEP === 0
  if (!isExactHalfStep) {
    throw new ValidationError('rating must be in 0.5 steps')
  }
  return Math.round(scaled) / RATING_STEP_SCALE
}

function parseListenedOn(value: unknown): string {
  if (typeof value !== 'string' || !isValidIsoDate(value)) {
    throw new ValidationError('listenedOn is required and must be a valid yyyy-mm-dd date')
  }
  return value
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function parseOptionalYear(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < MIN_YEAR || value > MAX_YEAR) {
    throw new ValidationError(`year must be an integer between ${MIN_YEAR} and ${MAX_YEAR}`)
  }
  return value
}

function parseOptionalString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`)
  }
  return value
}

function parseOptionalNote(value: unknown): string | null | undefined {
  const note = parseOptionalString(value, 'note')
  if (typeof note === 'string' && note.length > MAX_NOTE_LENGTH) {
    throw new ValidationError(`note must be ${MAX_NOTE_LENGTH} characters or fewer`)
  }
  return note
}

function parseOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${field} must be a boolean`)
  }
  return value
}

function parseQueryInt(
  value: unknown,
  field: string,
  opts: { fallback: number; min: number; max: number },
): number {
  if (value === undefined) return opts.fallback

  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || raw.trim().length === 0 || !/^-?\d+$/.test(raw)) {
    throw new ValidationError(`${field} must be an integer`)
  }

  const parsed = Number(raw)
  if (parsed < opts.min || parsed > opts.max) {
    throw new ValidationError(`${field} must be between ${opts.min} and ${opts.max}`)
  }
  return parsed
}
