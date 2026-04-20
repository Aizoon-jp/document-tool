import { API_PATHS, Item, ItemInput } from '../../types'

export async function listItems(): Promise<Item[]> {
  void API_PATHS.items.list
  throw new Error('API not implemented')
}

export async function getItem(id: string): Promise<Item> {
  void id
  void API_PATHS.items.get
  throw new Error('API not implemented')
}

export async function createItem(input: ItemInput): Promise<Item> {
  void input
  void API_PATHS.items.create
  throw new Error('API not implemented')
}

export async function updateItem(
  id: string,
  input: ItemInput
): Promise<Item> {
  void id
  void input
  void API_PATHS.items.update
  throw new Error('API not implemented')
}

export async function deleteItem(id: string): Promise<void> {
  void id
  void API_PATHS.items.delete
  throw new Error('API not implemented')
}
