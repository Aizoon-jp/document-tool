import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import {
  getDataDir,
  getDefaultDataDir,
  isUsingCustomDataDir,
  migrateDataDir,
  resetDataDir,
  setDataDir,
} from '../config/dataDir'
import { closeDatabase } from '../db/client'

export interface DataDirStatus {
  current: string
  default: string
  isCustom: boolean
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get-data-dir', (): DataDirStatus => {
    return {
      current: getDataDir(),
      default: getDefaultDataDir(),
      isCustom: isUsingCustomDataDir(),
    }
  })

  ipcMain.handle('settings:choose-data-dir', async (): Promise<string | null> => {
    const focused = BrowserWindow.getFocusedWindow()
    const result = focused
      ? await dialog.showOpenDialog(focused, {
          title: 'データ保存先フォルダを選択',
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: getDataDir(),
        })
      : await dialog.showOpenDialog({
          title: 'データ保存先フォルダを選択',
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: getDataDir(),
        })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle(
    'settings:change-data-dir',
    async (_e, newPath: string, mode: 'move' | 'use-existing'): Promise<void> => {
      if (mode === 'move') {
        migrateDataDir(newPath)
      }
      setDataDir(newPath)
      closeDatabase()
      app.relaunch()
      app.exit(0)
    }
  )

  ipcMain.handle('settings:reset-data-dir', async (): Promise<void> => {
    resetDataDir()
    closeDatabase()
    app.relaunch()
    app.exit(0)
  })
}
