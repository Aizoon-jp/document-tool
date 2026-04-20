import { API_PATHS, Client, ClientInput } from '../../types'

/**
 * @API_INTEGRATION
 * IPC: clients:list (API_PATHS.clients.list)
 * リクエスト: なし
 * レスポンス: Client[]
 */
export async function listClients(): Promise<Client[]> {
  void API_PATHS.clients.list
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: clients:get (API_PATHS.clients.get)
 * リクエスト: id（取引先ID）
 * レスポンス: Client
 */
export async function getClient(id: string): Promise<Client> {
  void id
  void API_PATHS.clients.get
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: clients:create (API_PATHS.clients.create)
 * リクエスト: ClientInput
 * レスポンス: Client
 */
export async function createClient(input: ClientInput): Promise<Client> {
  void input
  void API_PATHS.clients.create
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: clients:update (API_PATHS.clients.update)
 * リクエスト: id, ClientInput
 * レスポンス: Client
 */
export async function updateClient(
  id: string,
  input: ClientInput
): Promise<Client> {
  void id
  void input
  void API_PATHS.clients.update
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: clients:delete (API_PATHS.clients.delete)
 * リクエスト: id（取引先ID）
 * レスポンス: void
 */
export async function deleteClient(id: string): Promise<void> {
  void id
  void API_PATHS.clients.delete
  throw new Error('API not implemented')
}
