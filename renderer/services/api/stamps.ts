import { API_PATHS, Stamp, StampInput } from '../../types'

export async function listStamps(): Promise<Stamp[]> {
  void API_PATHS.stamps.list
  throw new Error('API not implemented')
}

export async function getStamp(id: string): Promise<Stamp> {
  void id
  void API_PATHS.stamps.get
  throw new Error('API not implemented')
}

export async function createStamp(input: StampInput): Promise<Stamp> {
  void input
  void API_PATHS.stamps.create
  throw new Error('API not implemented')
}

export async function updateStamp(
  id: string,
  input: StampInput
): Promise<Stamp> {
  void id
  void input
  void API_PATHS.stamps.update
  throw new Error('API not implemented')
}

export async function deleteStamp(id: string): Promise<void> {
  void id
  void API_PATHS.stamps.delete
  throw new Error('API not implemented')
}
