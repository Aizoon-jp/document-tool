import Store from 'electron-store'

export type StoreSchema = {
  dataDir?: string
  anthropicApiKey?: string
}

let store: Store<StoreSchema> | null = null

export function getStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({ name: 'app-settings' })
  }
  return store
}
