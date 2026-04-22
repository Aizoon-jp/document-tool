import path from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { getDataDir } from '../config/dataDir'

type DrizzleDb = BetterSQLite3Database<typeof schema>

let sqlite: Database.Database | null = null
let db: DrizzleDb | null = null

export function initDatabase(): DrizzleDb {
  if (db) return db

  const dbPath = path.join(getDataDir(), 'data.db')
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, 'migrations')
    : path.join(app.getAppPath(), 'main', 'db', 'migrations')

  migrate(db, { migrationsFolder })

  return db
}

export function getDatabase(): DrizzleDb {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}

export function setDatabaseForTesting(testDb: DrizzleDb | null): void {
  db = testDb
}

export { schema }
