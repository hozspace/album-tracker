import type Database from 'better-sqlite3'
import type { CreateLogInput, Log, UpdateLogInput } from '../types/log.js'

interface LogRow {
  id: number
  mbid: string | null
  title: string
  artist: string
  year: number | null
  art_url: string | null
  rating: number
  fave_track: string | null
  listened_on: string
  relisten: number
  note: string | null
  created_at: string
}

function toLog(row: LogRow): Log {
  return {
    id: row.id,
    mbid: row.mbid,
    title: row.title,
    artist: row.artist,
    year: row.year,
    artUrl: row.art_url,
    rating: row.rating,
    faveTrack: row.fave_track,
    listenedOn: row.listened_on,
    relisten: row.relisten === 1,
    note: row.note,
    createdAt: row.created_at,
  }
}

export function findAll(
  db: Database.Database,
  limit: number,
  offset: number,
): { logs: Log[]; total: number } {
  const rows = db
    .prepare(
      `SELECT * FROM logs
       ORDER BY listened_on DESC, created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as LogRow[]

  const { count } = db.prepare('SELECT COUNT(*) as count FROM logs').get() as {
    count: number
  }

  return { logs: rows.map(toLog), total: count }
}

export function findById(db: Database.Database, id: number): Log | null {
  const row = db.prepare('SELECT * FROM logs WHERE id = ?').get(id) as
    | LogRow
    | undefined
  return row ? toLog(row) : null
}

export function create(db: Database.Database, input: CreateLogInput): Log {
  const result = db
    .prepare(
      `INSERT INTO logs (mbid, title, artist, year, art_url, rating, fave_track, listened_on, relisten, note)
       VALUES (@mbid, @title, @artist, @year, @artUrl, @rating, @faveTrack, @listenedOn, @relisten, @note)`,
    )
    .run({
      mbid: input.mbid,
      title: input.title,
      artist: input.artist,
      year: input.year,
      artUrl: input.artUrl,
      rating: input.rating,
      faveTrack: input.faveTrack,
      listenedOn: input.listenedOn,
      relisten: input.relisten ? 1 : 0,
      note: input.note,
    })

  const created = findById(db, Number(result.lastInsertRowid))
  if (!created) throw new Error('failed to load created log')
  return created
}

const UPDATABLE_COLUMNS: Record<keyof UpdateLogInput, string> = {
  mbid: 'mbid',
  title: 'title',
  artist: 'artist',
  year: 'year',
  artUrl: 'art_url',
  rating: 'rating',
  faveTrack: 'fave_track',
  listenedOn: 'listened_on',
  relisten: 'relisten',
  note: 'note',
}

export function update(
  db: Database.Database,
  id: number,
  input: UpdateLogInput,
): Log | null {
  const entries = Object.entries(input) as [keyof UpdateLogInput, unknown][]
  if (entries.length === 0) return findById(db, id)

  const setClause = entries
    .map(([key]) => `${UPDATABLE_COLUMNS[key]} = @${key}`)
    .join(', ')

  const params: Record<string, unknown> = { id }
  for (const [key, value] of entries) {
    params[key] = key === 'relisten' ? (value ? 1 : 0) : value
  }

  db.prepare(`UPDATE logs SET ${setClause} WHERE id = @id`).run(params)
  return findById(db, id)
}

export function remove(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM logs WHERE id = ?').run(id)
  return result.changes > 0
}

export function countTotal(db: Database.Database): number {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM logs').get() as {
    count: number
  }
  return count
}

export function countAndAverageForMonth(
  db: Database.Database,
  monthStart: string,
  monthEndExclusive: string,
): { count: number; avg: number | null } {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count, AVG(rating) as avg FROM logs
       WHERE listened_on >= ? AND listened_on < ?`,
    )
    .get(monthStart, monthEndExclusive) as { count: number; avg: number | null }

  return { count: row.count, avg: row.avg }
}
