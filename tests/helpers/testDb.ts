import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../main/db/schema'

export type TestDb = BetterSQLite3Database<typeof schema>

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'main', 'db', 'migrations')

function readInitialSchema(): string {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  return files
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n')
}

export function createTestDb(): {
  db: TestDb
  raw: Database.Database
  close: () => void
} {
  const raw = new Database(':memory:')
  raw.pragma('foreign_keys = ON')
  raw.exec(readInitialSchema())
  const db = drizzle(raw, { schema })
  return {
    db,
    raw,
    close: () => raw.close(),
  }
}
