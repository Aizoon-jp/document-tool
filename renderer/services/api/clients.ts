import { API_PATHS, Client, ClientInput } from '../../types'

export async function listClients(): Promise<Client[]> {
  return window.ipc.invoke<Client[]>(API_PATHS.clients.list)
}

export async function getClient(id: string): Promise<Client | null> {
  return window.ipc.invoke<Client | null>(API_PATHS.clients.get, id)
}

export async function createClient(input: ClientInput): Promise<Client> {
  return window.ipc.invoke<Client>(API_PATHS.clients.create, input)
}

export async function updateClient(
  id: string,
  input: ClientInput
): Promise<Client> {
  return window.ipc.invoke<Client>(API_PATHS.clients.update, id, input)
}

export async function deleteClient(id: string): Promise<void> {
  await window.ipc.invoke<void>(API_PATHS.clients.delete, id)
}
