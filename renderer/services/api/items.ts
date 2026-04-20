import { API_PATHS, Item, ItemInput } from '../../types'

/**
 * @API_INTEGRATION
 * IPC: items:list (API_PATHS.items.list)
 * リクエスト: なし
 * レスポンス: Item[]
 */
export async function listItems(): Promise<Item[]> {
  void API_PATHS.items.list
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: items:get:${id} (API_PATHS.items.get)
 * リクエスト: id（品目ID）
 * レスポンス: Item
 */
export async function getItem(id: string): Promise<Item> {
  void API_PATHS.items.get(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: items:create (API_PATHS.items.create)
 * リクエスト: ItemInput
 * レスポンス: Item
 */
export async function createItem(input: ItemInput): Promise<Item> {
  void input
  void API_PATHS.items.create
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: items:update:${id} (API_PATHS.items.update)
 * リクエスト: id, ItemInput
 * レスポンス: Item
 */
export async function updateItem(
  id: string,
  input: ItemInput
): Promise<Item> {
  void input
  void API_PATHS.items.update(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: items:delete:${id} (API_PATHS.items.delete)
 * リクエスト: id（品目ID）
 * レスポンス: void
 */
export async function deleteItem(id: string): Promise<void> {
  void API_PATHS.items.delete(id)
  throw new Error('API not implemented')
}
