import type {
  Client,
  ClientInput,
  Company,
  CompanyInput,
  Document,
  DocumentDraft,
  DocumentFilter,
  DocumentLine,
  DocumentSetting,
  DocumentSettingInput,
  DocumentSort,
  DocumentType,
  Item,
  ItemInput,
  MonthlySummary,
  NextDocumentNumber,
  Stamp,
  StampInput,
} from '../../renderer/types'

export interface StampCreateInput extends StampInput {
  imageDataUrl: string
}

export interface StampUpdateInput extends Partial<StampInput> {
  imageDataUrl?: string
}

export interface DataDirStatus {
  current: string
  default: string
  isCustom: boolean
}

export interface IpcApi {
  'app:getVersion': () => Promise<string>

  'company:get': () => Promise<Company | null>
  'company:update': (input: CompanyInput) => Promise<Company>

  'clients:list': () => Promise<Client[]>
  'clients:get': (id: string) => Promise<Client | null>
  'clients:create': (input: ClientInput) => Promise<Client>
  'clients:update': (id: string, input: ClientInput) => Promise<Client>
  'clients:delete': (id: string) => Promise<void>

  'items:list': () => Promise<Item[]>
  'items:get': (id: string) => Promise<Item | null>
  'items:create': (input: ItemInput) => Promise<Item>
  'items:update': (id: string, input: ItemInput) => Promise<Item>
  'items:delete': (id: string) => Promise<void>

  'stamps:list': () => Promise<Stamp[]>
  'stamps:get': (id: string) => Promise<Stamp | null>
  'stamps:create': (input: StampCreateInput) => Promise<Stamp>
  'stamps:update': (id: string, input: StampUpdateInput) => Promise<Stamp>
  'stamps:delete': (id: string) => Promise<void>

  'document-settings:list': () => Promise<DocumentSetting[]>
  'document-settings:update': (
    type: DocumentType,
    input: DocumentSettingInput
  ) => Promise<DocumentSetting>

  'documents:next-number': (
    type: DocumentType,
    clientId?: string
  ) => Promise<NextDocumentNumber>
  'documents:list': (sort?: DocumentSort) => Promise<Document[]>
  'documents:list-recent': (limit?: number) => Promise<Document[]>
  'documents:search': (
    filter: DocumentFilter,
    sort?: DocumentSort
  ) => Promise<Document[]>
  'documents:monthly-summary': (yearMonth: string) => Promise<MonthlySummary>
  'documents:get': (id: string) => Promise<Document | null>
  'documents:lines': (id: string) => Promise<DocumentLine[]>
  'documents:create': (draft: DocumentDraft) => Promise<Document>
  'documents:update': (id: string, draft: DocumentDraft) => Promise<Document>
  'documents:delete': (id: string) => Promise<void>
  'documents:duplicate': (id: string) => Promise<Document>
  'documents:generate-pdf': (id: string) => Promise<{ filePath: string }>

  'settings:get-data-dir': () => Promise<DataDirStatus>
  'settings:choose-data-dir': () => Promise<string | null>
  'settings:change-data-dir': (
    newPath: string,
    mode: 'move' | 'use-existing'
  ) => Promise<void>
  'settings:reset-data-dir': () => Promise<void>
}

export type IpcChannel = keyof IpcApi
