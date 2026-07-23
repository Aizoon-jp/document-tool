import type {
  DocumentDraft,
  DocumentLineInput,
  DocumentOptions,
} from '../../renderer/types'
import {
  buildTaxBreakdown,
  calcWithholdingTax,
  lineSubtotalExclTax,
  roundTaxAmount,
  sumTaxAmount,
  type TaxBreakdownEntry,
} from './taxCalc'

export interface CalculatedLine extends DocumentLineInput {
  lineNumber: number
  subtotalExclTax: number
  subtotalInclTax: number
}

export interface CalculatedTotals {
  subtotal: number
  taxAmount: number
  totalAmount: number
  withholdingTax: number
  taxBreakdown: TaxBreakdownEntry[]
  lines: CalculatedLine[]
}

/** 後方互換のためのエイリアス（旧名で参照している箇所向け）。 */
export const calculateWithholdingTax = calcWithholdingTax

export function calculateLine(
  line: DocumentLineInput,
  lineNumber: number
): CalculatedLine {
  const subtotalExclTax = lineSubtotalExclTax(line.quantity, line.unitPrice)
  // 行ごとの税込は参考値。消費税の確定額は税率ごとに1回だけ端数処理する
  // （buildTaxBreakdown）ため、この値を合計に使ってはならない。
  const referenceTax = roundTaxAmount((subtotalExclTax * line.taxRate) / 100)
  return {
    ...line,
    lineNumber,
    subtotalExclTax,
    subtotalInclTax: subtotalExclTax + referenceTax,
  }
}

export function calculateTotals(draft: DocumentDraft): CalculatedTotals {
  if (draft.detailMode === 'external') {
    const external = Math.max(0, Math.round(draft.externalAmount || 0))
    const withholdingTax = draft.options.withholdingTax
      ? calcWithholdingTax(external)
      : 0
    return {
      subtotal: external,
      taxAmount: 0,
      totalAmount: external,
      withholdingTax,
      taxBreakdown: [],
      lines: [],
    }
  }

  const lines = draft.lines.map((line, idx) => calculateLine(line, idx + 1))
  const subtotal = lines.reduce((s, l) => s + l.subtotalExclTax, 0)
  const taxBreakdown = buildTaxBreakdown(
    lines.map((l) => ({ taxRate: l.taxRate, amount: l.subtotalExclTax })),
    draft.options.includeTax
  )
  const taxAmount = sumTaxAmount(taxBreakdown)
  const totalAmount = subtotal + taxAmount
  const withholdingTax = draft.options.withholdingTax
    ? calcWithholdingTax(subtotal)
    : 0
  return { subtotal, taxAmount, totalAmount, withholdingTax, taxBreakdown, lines }
}

export function emptyOptions(): DocumentOptions {
  return {
    includeTax: true,
    reducedTaxRate: true,
    withholdingTax: false,
    showRemarks: true,
    showBankInfo: true,
  }
}
