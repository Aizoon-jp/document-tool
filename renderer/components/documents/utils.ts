import { TaxRate } from '../../types'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(amount)

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
