import type { StampCreateInput, StampUpdateInput } from '../../../shared/types/ipc'
import { API_PATHS, Stamp } from '../../types'

export type { StampCreateInput, StampUpdateInput }

export async function listStamps(): Promise<Stamp[]> {
  return window.ipc.invoke<Stamp[]>(API_PATHS.stamps.list)
}

export async function getStamp(id: string): Promise<Stamp | null> {
  return window.ipc.invoke<Stamp | null>(API_PATHS.stamps.get, id)
}

export async function createStamp(input: StampCreateInput): Promise<Stamp> {
  return window.ipc.invoke<Stamp>(API_PATHS.stamps.create, input)
}

export async function updateStamp(
  id: string,
  input: StampUpdateInput
): Promise<Stamp> {
  return window.ipc.invoke<Stamp>(API_PATHS.stamps.update, id, input)
}

export async function deleteStamp(id: string): Promise<void> {
  await window.ipc.invoke<void>(API_PATHS.stamps.delete, id)
}
