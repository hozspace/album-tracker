import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runMigrations } from './migrations.js'
import { DATA_DIR } from './lib/dataDir.js'

mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(join(DATA_DIR, 'album-tracker.db'))
db.pragma('journal_mode = WAL')

runMigrations(db)
