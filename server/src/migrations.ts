import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type Database from 'better-sqlite3'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations')

export function runMigrations(db: Database.Database): void {
  const applied = getAppliedMigrations(db)
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file)
  }
}

function getAppliedMigrations(db: Database.Database): Set<string> {
  const migrationsTable = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migrations'`,
    )
    .get()

  if (!migrationsTable) return new Set()

  const rows = db.prepare('SELECT filename FROM migrations').all() as {
    filename: string
  }[]
  return new Set(rows.map((row) => row.filename))
}
