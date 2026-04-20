import { API_PATHS, Item, ItemInput } from '../../types'

export async function listItems(): Promise<Item[]> {
  return window.ipc.invoke<Item[]>(API_PATHS.items.list)
}

export async function getItem(id: string): Promise<Item | null> {
  return window.ipc.invoke<Item | null>(API_PATHS.items.get, id)
}

export async function createItem(input: ItemInput): Promise<Item> {
  return window.ipc.invoke<Item>(API_PATHS.items.create, input)
}

export async function updateItem(
  id: string,
  input: ItemInput
): Promise<Item> {
  return window.ipc.invoke<Item>(API_PATHS.items.update, id, input)
}

export async function deleteItem(id: string): Promise<void> {
  await window.ipc.invoke<void>(API_PATHS.items.delete, id)
}
