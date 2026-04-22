export type DocumentType =
  | 'invoice'
  | 'receipt'
  | 'quote'
  | 'payment_request'
  | 'delivery_note'

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  invoice: '請求書',
  receipt: '領収書',
  quote: '見積書',
  payment_request: '振込依頼書',
  delivery_note: '納品書',
}

export type DetailMode = 'direct' | 'external'

export interface DocumentOptions {
  includeTax: boolean
  reducedTaxRate: boolean
  withholdingTax: boolean
  showRemarks: boolean
  showBankInfo: boolean
}

export type BankAccountType = 'ordinary' | 'checking'

export interface Company {
  id: string
  name: string
  tradeName: string | null
  postalCode: string | null
  address: string | null
  tel: string | null
  fax: string | null
  email: string | null
  website: string | null
  representativeName: string | null
  invoiceNumber: string | null
  bankName: string | null
  bankBranch: string | null
  bankAccountType: BankAccountType | null
  bankAccountNumber: string | null
  bankAccountHolderKana: string | null
  createdAt: string
  updatedAt: string
}

export type Honorific = '御中' | '様'
export type TaxCategory = 'taxable_10' | 'taxable_8' | 'tax_free'

export interface Client {
  id: string
  name: string
  honorific: Honorific
  postalCode: string | null
  address: string | null
  tel: string | null
  contactPerson: string | null
  contactDepartment: string | null
  paymentTerms: string | null
  defaultTaxCategory: TaxCategory
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type TaxRate = 10 | 8 | 0

export interface Item {
  id: string
  name: string
  unitPrice: number
  unit: string
  taxRate: TaxRate
  isReducedTaxRate: boolean
  defaultQuantity: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Stamp {
  id: string
  name: string
  imagePath: string
  defaultXMm: number
  defaultYMm: number
  widthMm: number
  opacity: number
  isDefault: boolean
  createdAt: string
}

export interface DocumentSetting {
  id: string
  documentType: DocumentType
  numberFormat: string
  defaultOptions: DocumentOptions
  defaultRemarks: string | null
  createdAt: string
  updatedAt: string
}

export type CompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
export type ItemInput = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
export type StampInput = Omit<Stamp, 'id' | 'createdAt'>
export type DocumentSettingInput = Omit<
  DocumentSetting,
  'id' | 'createdAt' | 'updatedAt'
>

export interface Document {
  id: string
  documentType: DocumentType
  documentNumber: string
  issueDate: string
  clientId: string
  clientName: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  withholdingTax: number
  options: DocumentOptions
  stampId: string | null
  detailMode: DetailMode
  remarks: string | null
  pdfFilePath: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentLine {
  id: string
  documentId: string
  lineNumber: number
  content: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: TaxRate
  isReducedTaxRate: boolean
  subtotalExclTax: number
  subtotalInclTax: number
}

export interface DocumentWithLines extends Document {
  lines: DocumentLine[]
}

export interface DocumentLineInput {
  itemId: string | null
  content: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: TaxRate
  isReducedTaxRate: boolean
}

export interface DocumentDraft {
  documentType: DocumentType
  documentNumber: string
  issueDate: string
  clientId: string
  detailMode: DetailMode
  lines: DocumentLineInput[]
  externalAmount: number
  options: DocumentOptions
  stampIds: string[]
  remarks: string
}

export interface NextDocumentNumber {
  documentType: DocumentType
  yearMonth: string
  sequence: number
  formatted: string
}

export interface MonthlySummary {
  yearMonth: string
  totalCount: number
  breakdown: Record<DocumentType, number>
}

export interface DocumentFilter {
  clientName?: string
  startDate?: string
  endDate?: string
  documentType?: DocumentType | 'all'
  minAmount?: number
  maxAmount?: number
}

export type DocumentSortKey =
  | 'issueDate'
  | 'totalAmount'
  | 'documentNumber'
  | 'clientName'

export type SortDirection = 'asc' | 'desc'

export interface DocumentSort {
  key: DocumentSortKey
  direction: SortDirection
}

export const API_PATHS = {
  documents: {
    list: 'documents:list',
    listRecent: 'documents:list-recent',
    search: 'documents:search',
    monthlySummary: 'documents:monthly-summary',
    get: 'documents:get',
    lines: 'documents:lines',
    create: 'documents:create',
    update: 'documents:update',
    delete: 'documents:delete',
    generatePdf: 'documents:generate-pdf',
    duplicate: 'documents:duplicate',
    nextNumber: 'documents:next-number',
  },
  clients: {
    list: 'clients:list',
    get: 'clients:get',
    create: 'clients:create',
    update: 'clients:update',
    delete: 'clients:delete',
  },
  items: {
    list: 'items:list',
    get: 'items:get',
    create: 'items:create',
    update: 'items:update',
    delete: 'items:delete',
  },
  stamps: {
    list: 'stamps:list',
    get: 'stamps:get',
    create: 'stamps:create',
    update: 'stamps:update',
    delete: 'stamps:delete',
  },
  company: {
    get: 'company:get',
    update: 'company:update',
  },
  documentSettings: {
    list: 'document-settings:list',
    update: 'document-settings:update',
  },
  settings: {
    getDataDir: 'settings:get-data-dir',
    chooseDataDir: 'settings:choose-data-dir',
    changeDataDir: 'settings:change-data-dir',
    resetDataDir: 'settings:reset-data-dir',
  },
} as const

export interface DataDirStatus {
  current: string
  default: string
  isCustom: boolean
}
