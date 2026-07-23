import type { TaxRate } from '../../renderer/types'

// 税計算のロジック。renderer 側（renderer/components/documents/utils.ts）にも
// 同一の実装があり、tests/unit/tax.test.ts で両者が一致することを検証している。
// Nextron の main / renderer は webpack が分かれており共有モジュールを跨げないため、
// 意図的に実装を二重化している。片方を変更したら必ずもう片方も揃えること。

/** 消費税額の端数処理。切り捨てを採用する（請求実務で最も一般的）。 */
export function roundTaxAmount(value: number): number {
  return Math.floor(value)
}

/** 明細1行の税抜金額（対価）。数量×単価。端数は切り捨て。 */
export function lineSubtotalExclTax(quantity: number, unitPrice: number): number {
  return Math.floor(quantity * unitPrice)
}

export interface TaxBreakdownEntry {
  taxRate: TaxRate
  /** この税率に区分した税抜対価の合計 */
  taxableAmount: number
  /** taxableAmount に税率を乗じ、1回だけ端数処理した消費税額 */
  taxAmount: number
}

/**
 * 税率ごとの区分（対価の合計）と消費税額を求める。
 * インボイス制度では消費税額の端数処理は「一の適格請求書につき、税率ごとに1回」
 * （国税庁 タックスアンサー No.6371）。行ごとに端数処理して合算せず、税率ごとに
 * 対価を合計してから1回だけ端数処理する。
 */
export function buildTaxBreakdown(
  taxableLines: { taxRate: TaxRate; amount: number }[],
  includeTax: boolean
): TaxBreakdownEntry[] {
  const totals = new Map<TaxRate, number>()
  for (const line of taxableLines) {
    totals.set(line.taxRate, (totals.get(line.taxRate) ?? 0) + line.amount)
  }
  return [...totals.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([taxRate, taxableAmount]) => ({
      taxRate,
      taxableAmount,
      taxAmount: includeTax ? roundTaxAmount((taxableAmount * taxRate) / 100) : 0,
    }))
}

/** 税率区分の消費税額の合計。 */
export function sumTaxAmount(breakdown: TaxBreakdownEntry[]): number {
  return breakdown.reduce((sum, entry) => sum + entry.taxAmount, 0)
}

/**
 * 源泉徴収税。報酬額100万円以下は10.21%、100万円を超える部分は20.42%
 * （所得税法205条 + 復興特別所得税）。
 */
export function calcWithholdingTax(taxableAmount: number): number {
  if (taxableAmount <= 0) return 0
  if (taxableAmount <= 1_000_000) {
    return Math.floor(taxableAmount * 0.1021)
  }
  return Math.floor((taxableAmount - 1_000_000) * 0.2042 + 102_100)
}
