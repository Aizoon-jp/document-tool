import { DocumentType, TaxRate } from '../../types'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(amount)

export const DOCUMENT_NUMBER_PREFIX: Record<DocumentType, string> = {
  invoice: 'INV',
  receipt: 'RCP',
  quote: 'QUO',
  payment_request: 'PAY',
  delivery_note: 'DLV',
}

/** ダミー採番。実装時はDBのシーケンスから取得する */
export const generateDocumentNumber = (
  type: DocumentType,
  issueDate: string
): string => {
  const date = new Date(issueDate)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${DOCUMENT_NUMBER_PREFIX[type]}-${year}-${month}-001`
}

export interface LineCalc {
  subtotalExclTax: number
  taxAmount: number
  subtotalInclTax: number
}

export const calcLine = (
  quantity: number,
  unitPrice: number,
  taxRate: TaxRate,
  includeTax: boolean
): LineCalc => {
  const subtotalExclTax = quantity * unitPrice
  const taxAmount = includeTax
    ? Math.floor((subtotalExclTax * taxRate) / 100)
    : 0
  return {
    subtotalExclTax,
    taxAmount,
    subtotalInclTax: subtotalExclTax + taxAmount,
  }
}

/** 源泉徴収税: 報酬×10.21%（100万円超は超過分20.42%。ここでは単純に10.21%） */
export const calcWithholdingTax = (subtotal: number): number =>
  Math.floor(subtotal * 0.1021)
