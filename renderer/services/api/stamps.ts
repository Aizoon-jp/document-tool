import { API_PATHS, Stamp, StampInput } from '../../types'

/**
 * @API_INTEGRATION
 * IPC: stamps:list (API_PATHS.stamps.list)
 * リクエスト: なし
 * レスポンス: Stamp[]
 */
export async function listStamps(): Promise<Stamp[]> {
  void API_PATHS.stamps.list
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: stamps:get:${id} (API_PATHS.stamps.get)
 * リクエスト: id（印影ID）
 * レスポンス: Stamp
 */
export async function getStamp(id: string): Promise<Stamp> {
  void API_PATHS.stamps.get(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: stamps:create (API_PATHS.stamps.create)
 * リクエスト: StampInput
 * レスポンス: Stamp
 */
export async function createStamp(input: StampInput): Promise<Stamp> {
  void input
  void API_PATHS.stamps.create
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: stamps:update:${id} (API_PATHS.stamps.update)
 * リクエスト: id, StampInput
 * レスポンス: Stamp
 */
export async function updateStamp(
  id: string,
  input: StampInput
): Promise<Stamp> {
  void input
  void API_PATHS.stamps.update(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: stamps:delete:${id} (API_PATHS.stamps.delete)
 * リクエスト: id（印影ID）
 * レスポンス: void
 */
export async function deleteStamp(id: string): Promise<void> {
  void API_PATHS.stamps.delete(id)
  throw new Error('API not implemented')
}
