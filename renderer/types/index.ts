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
