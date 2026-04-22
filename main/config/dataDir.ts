import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import Store from 'electron-store'

type StoreSchema = {
  dataDir?: string
}

let store: Store<StoreSchema> | null = null

function getStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({ name: 'app-settings' })
  }
  return store
}

export function getDataDir(): string {
  const custom = getStore().get('dataDir')
  if (custom && fs.existsSync(custom)) {
    return custom
  }
  return app.getPath('userData')
}

export function setDataDir(newPath: string): void {
  if (!fs.existsSync(newPath)) {
    fs.mkdirSync(newPath, { recursive: true })
  }
  getStore().set('dataDir', newPath)
}

export function resetDataDir(): void {
  getStore().delete('dataDir')
}

export function isUsingCustomDataDir(): boolean {
  const custom = getStore().get('dataDir')
  return Boolean(custom && fs.existsSync(custom))
}

export function getDefaultDataDir(): string {
  return app.getPath('userData')
}

export function migrateDataDir(toPath: string): void {
  const from = getDataDir()
  if (path.resolve(from) === path.resolve(toPath)) return

  if (!fs.existsSync(toPath)) {
    fs.mkdirSync(toPath, { recursive: true })
  }

  const copyItem = (name: string): void => {
    const src = path.join(from, name)
    const dst = path.join(toPath, name)
    if (!fs.existsSync(src)) return
    if (fs.existsSync(dst)) return
    fs.cpSync(src, dst, { recursive: true })
  }

  copyItem('data.db')
  copyItem('data.db-wal')
  copyItem('data.db-shm')
  copyItem('stamps')
}
