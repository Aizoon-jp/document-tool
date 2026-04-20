import type {
  DocumentDraft,
  DocumentLineInput,
  DocumentOptions,
} from '../../renderer/types'

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
  lines: CalculatedLine[]
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5)
}

export function calculateLine(
  line: DocumentLineInput,
  lineNumber: number
): CalculatedLine {
  const subtotalExclTax = roundHalfUp(line.quantity * line.unitPrice)
  const taxAmount = roundHalfUp((subtotalExclTax * line.taxRate) / 100)
  const subtotalInclTax = subtotalExclTax + taxAmount
  return {
    ...line,
    lineNumber,
    subtotalExclTax,
    subtotalInclTax,
  }
}

export function calculateTotals(draft: DocumentDraft): CalculatedTotals {
  if (draft.detailMode === 'external') {
    const external = Math.max(0, Math.round(draft.externalAmount || 0))
    const withholdingTax = draft.options.withholdingTax
      ? calculateWithholdingTax(external)
      : 0
    return {
      subtotal: external,
      taxAmount: 0,
      totalAmount: external,
      withholdingTax,
      lines: [],
    }
  }

  const lines = draft.lines.map((line, idx) => calculateLine(line, idx + 1))
  const subtotal = lines.reduce((s, l) => s + l.subtotalExclTax, 0)
  const taxAmount = draft.options.includeTax
    ? lines.reduce((s, l) => s + (l.subtotalInclTax - l.subtotalExclTax), 0)
    : 0
  const totalAmount = subtotal + taxAmount
  const withholdingTax = draft.options.withholdingTax
    ? calculateWithholdingTax(subtotal)
    : 0
  return { subtotal, taxAmount, totalAmount, withholdingTax, lines }
}

export function calculateWithholdingTax(taxableAmount: number): number {
  if (taxableAmount <= 0) return 0
  if (taxableAmount <= 1_000_000) {
    return Math.floor(taxableAmount * 0.1021)
  }
  return Math.floor((taxableAmount - 1_000_000) * 0.2042 + 102_100)
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
