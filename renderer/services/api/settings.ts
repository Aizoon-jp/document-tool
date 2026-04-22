import { API_PATHS, DataDirStatus } from '../../types'

export async function getDataDir(): Promise<DataDirStatus> {
  return window.ipc.invoke<DataDirStatus>(API_PATHS.settings.getDataDir)
}

export async function chooseDataDir(): Promise<string | null> {
  return window.ipc.invoke<string | null>(API_PATHS.settings.chooseDataDir)
}

export async function changeDataDir(
  newPath: string,
  mode: 'move' | 'use-existing'
): Promise<void> {
  return window.ipc.invoke<void>(API_PATHS.settings.changeDataDir, newPath, mode)
}

export async function resetDataDir(): Promise<void> {
  return window.ipc.invoke<void>(API_PATHS.settings.resetDataDir)
}
