import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import * as companyApi from './company'
import * as clientsApi from './clients'
import * as itemsApi from './items'
import * as stampsApi from './stamps'
import * as settingsApi from './documentSettings'
import * as documentsApi from './documents'
import * as numbersApi from './documentsNumber'
import { registerSettingsHandlers } from './settings'
import { generatePdf } from '../pdf/generator'

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>

function wrap<T extends (...args: never[]) => Promise<unknown>>(
  fn: T
): Handler {
  return async (_event, ...args: unknown[]) => {
    return (fn as unknown as (...args: unknown[]) => Promise<unknown>)(...args)
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('company:get', wrap(companyApi.getCompany))
  ipcMain.handle('company:update', wrap(companyApi.updateCompany))

  ipcMain.handle('clients:list', wrap(clientsApi.listClients))
  ipcMain.handle('clients:get', wrap(clientsApi.getClient))
  ipcMain.handle('clients:create', wrap(clientsApi.createClient))
  ipcMain.handle('clients:update', wrap(clientsApi.updateClient))
  ipcMain.handle('clients:delete', wrap(clientsApi.deleteClient))

  ipcMain.handle('items:list', wrap(itemsApi.listItems))
  ipcMain.handle('items:get', wrap(itemsApi.getItem))
  ipcMain.handle('items:create', wrap(itemsApi.createItem))
  ipcMain.handle('items:update', wrap(itemsApi.updateItem))
  ipcMain.handle('items:delete', wrap(itemsApi.deleteItem))

  ipcMain.handle('stamps:list', wrap(stampsApi.listStamps))
  ipcMain.handle('stamps:get', wrap(stampsApi.getStamp))
  ipcMain.handle('stamps:create', wrap(stampsApi.createStamp))
  ipcMain.handle('stamps:update', wrap(stampsApi.updateStamp))
  ipcMain.handle('stamps:delete', wrap(stampsApi.deleteStamp))

  ipcMain.handle('document-settings:list', wrap(settingsApi.listDocumentSettings))
  ipcMain.handle('document-settings:update', wrap(settingsApi.updateDocumentSetting))

  ipcMain.handle('documents:next-number', wrap(numbersApi.getNextDocumentNumber))
  ipcMain.handle('documents:list', wrap(documentsApi.listDocuments))
  ipcMain.handle('documents:list-recent', wrap(documentsApi.listRecentDocuments))
  ipcMain.handle('documents:search', wrap(documentsApi.searchDocuments))
  ipcMain.handle('documents:monthly-summary', wrap(documentsApi.getMonthlySummary))
  ipcMain.handle('documents:get', wrap(documentsApi.getDocument))
  ipcMain.handle('documents:lines', wrap(documentsApi.getDocumentLines))
  ipcMain.handle('documents:create', wrap(documentsApi.createDocument))
  ipcMain.handle('documents:update', wrap(documentsApi.updateDocument))
  ipcMain.handle('documents:delete', wrap(documentsApi.deleteDocument))
  ipcMain.handle('documents:duplicate', wrap(documentsApi.duplicateDocument))
  ipcMain.handle('documents:generate-pdf', (_event, id: string) => generatePdf(id))

  registerSettingsHandlers()
}
