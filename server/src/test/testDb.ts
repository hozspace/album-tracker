import Database from 'better-sqlite3'
import { runMigrations } from '../migrations.js'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  runMigrations(db)
  return db
}
