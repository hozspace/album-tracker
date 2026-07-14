import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { runMigrations } from './migrations.js'

const DATA_DIR = resolve(process.env.DATA_DIR ?? '../data')
mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(join(DATA_DIR, 'album-tracker.db'))
db.pragma('journal_mode = WAL')

runMigrations(db)
