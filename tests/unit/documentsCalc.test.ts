import { describe, expect, it } from 'vitest'
import type { DocumentDraft } from '../../renderer/types'
import {
  calculateLine,
  calculateTotals,
  calculateWithholdingTax,
} from '../../main/ipc/documentsCalc'

const baseOptions = {
  includeTax: true,
  reducedTaxRate: true,
  withholdingTax: false,
  showRemarks: true,
  showBankInfo: true,
}

describe('calculateLine', () => {
  it('10%税率で小計・税込を計算する', () => {
    const result = calculateLine(
      {
        itemId: null,
        content: 'Webサイト制作',
        quantity: 2,
        unit: '式',
        unitPrice: 100_000,
        taxRate: 10,
        isReducedTaxRate: false,
      },
      1
    )
    expect(result.subtotalExclTax).toBe(200_000)
    expect(result.subtotalInclTax).toBe(220_000)
    expect(result.lineNumber).toBe(1)
  })

  it('軽減税率8%を計算する', () => {
    const result = calculateLine(
      {
        itemId: null,
        content: '会議用弁当',
        quantity: 10,
        unit: '個',
        unitPrice: 1_200,
        taxRate: 8,
        isReducedTaxRate: true,
      },
      2
    )
    expect(result.subtotalExclTax).toBe(12_000)
    expect(result.subtotalInclTax).toBe(12_960)
  })

  it('非課税0%で税込=税抜になる', () => {
    const result = calculateLine(
      {
        itemId: null,
        content: '交通費実費',
        quantity: 1,
        unit: '式',
        unitPrice: 5_000,
        taxRate: 0,
        isReducedTaxRate: false,
      },
      3
    )
    expect(result.subtotalExclTax).toBe(5_000)
    expect(result.subtotalInclTax).toBe(5_000)
  })
})

describe('calculateTotals', () => {
  it('直接明細モードで合計を集計する', () => {
    const draft: DocumentDraft = {
      documentType: 'invoice',
      documentNumber: 'INV-2026-04-001',
      issueDate: '2026-04-20',
      clientId: 'c1',
      detailMode: 'direct',
      externalAmount: 0,
      options: baseOptions,
      stampIds: [],
      remarks: '',
      lines: [
        {
          itemId: null,
          content: 'Webサイト制作',
          quantity: 1,
          unit: '式',
          unitPrice: 100_000,
          taxRate: 10,
          isReducedTaxRate: false,
        },
        {
          itemId: null,
          content: '会議用弁当',
          quantity: 5,
          unit: '個',
          unitPrice: 1_000,
          taxRate: 8,
          isReducedTaxRate: true,
        },
      ],
    }
    const totals = calculateTotals(draft)
    expect(totals.subtotal).toBe(105_000)
    expect(totals.taxAmount).toBe(10_000 + 400)
    expect(totals.totalAmount).toBe(115_400)
    expect(totals.withholdingTax).toBe(0)
    expect(totals.lines).toHaveLength(2)
    expect(totals.lines[0].lineNumber).toBe(1)
    expect(totals.lines[1].lineNumber).toBe(2)
  })

  it('外部合計モードでは明細なしで externalAmount を採用', () => {
    const draft: DocumentDraft = {
      documentType: 'receipt',
      documentNumber: 'RCP-2026-04-001',
      issueDate: '2026-04-20',
      clientId: 'c1',
      detailMode: 'external',
      externalAmount: 55_000,
      options: baseOptions,
      stampIds: [],
      remarks: '',
      lines: [],
    }
    const totals = calculateTotals(draft)
    expect(totals.subtotal).toBe(55_000)
    expect(totals.taxAmount).toBe(0)
    expect(totals.totalAmount).toBe(55_000)
    expect(totals.lines).toHaveLength(0)
  })

  it('源泉徴収税オプションONで withholdingTax を計算する', () => {
    const draft: DocumentDraft = {
      documentType: 'invoice',
      documentNumber: 'INV-2026-04-001',
      issueDate: '2026-04-20',
      clientId: 'c1',
      detailMode: 'direct',
      externalAmount: 0,
      options: { ...baseOptions, withholdingTax: true },
      stampIds: [],
      remarks: '',
      lines: [
        {
          itemId: null,
          content: 'コンサルティング',
          quantity: 1,
          unit: '式',
          unitPrice: 500_000,
          taxRate: 10,
          isReducedTaxRate: false,
        },
      ],
    }
    const totals = calculateTotals(draft)
    expect(totals.subtotal).toBe(500_000)
    expect(totals.withholdingTax).toBe(51_050)
  })
})

describe('calculateWithholdingTax', () => {
  it('100万円以下は10.21%（小数切捨）', () => {
    expect(calculateWithholdingTax(500_000)).toBe(51_050)
    expect(calculateWithholdingTax(1_000_000)).toBe(102_100)
    expect(calculateWithholdingTax(0)).toBe(0)
    expect(calculateWithholdingTax(-1)).toBe(0)
  })

  it('100万円超は超過部分20.42% + 102,100円', () => {
    expect(calculateWithholdingTax(1_500_000)).toBe(102_100 + Math.floor(500_000 * 0.2042))
  })
})
