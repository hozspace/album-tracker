import type Database from 'better-sqlite3'
import type { CreateRecInput, Rec, RecStatus } from '../types/rec.js'

interface RecRow {
  id: number
  artist: string
  title: string
  year: number | null
  mbid: string | null
  art_url: string | null
  because: string
  mode: string
  status: string
  created_at: string
}

function toRec(row: RecRow): Rec {
  return {
    id: row.id,
    artist: row.artist,
    title: row.title,
    year: row.year,
    mbid: row.mbid,
    artUrl: row.art_url,
    because: row.because,
    mode: row.mode as Rec['mode'],
    status: row.status as Rec['status'],
    createdAt: row.created_at,
  }
}

export function create(db: Database.Database, input: CreateRecInput): Rec {
  const result = db
    .prepare(
      `INSERT INTO recs (artist, title, year, mbid, art_url, because, mode)
       VALUES (@artist, @title, @year, @mbid, @artUrl, @because, @mode)`,
    )
    .run({
      artist: input.artist,
      title: input.title,
      year: input.year,
      mbid: input.mbid,
      artUrl: input.artUrl,
      because: input.because,
      mode: input.mode,
    })

  const created = findById(db, Number(result.lastInsertRowid))
  if (!created) throw new Error('failed to load created rec')
  return created
}

export function findById(db: Database.Database, id: number): Rec | null {
  const row = db.prepare('SELECT * FROM recs WHERE id = ?').get(id) as RecRow | undefined
  return row ? toRec(row) : null
}

export function findPending(db: Database.Database): Rec[] {
  const rows = db
    .prepare(`SELECT * FROM recs WHERE status = 'pending' ORDER BY created_at DESC, id DESC`)
    .all() as RecRow[]
  return rows.map(toRec)
}

// All recs regardless of status, newest first. Used to build the do-not-repeat
// list (and soft dismissed-signal) fed into the recommendation context.
export function findAll(db: Database.Database): Rec[] {
  const rows = db.prepare('SELECT * FROM recs ORDER BY created_at DESC, id DESC').all() as RecRow[]
  return rows.map(toRec)
}

export function updateStatus(db: Database.Database, id: number, status: RecStatus): Rec | null {
  const result = db.prepare('UPDATE recs SET status = ? WHERE id = ?').run(status, id)
  if (result.changes === 0) return null
  return findById(db, id)
}
