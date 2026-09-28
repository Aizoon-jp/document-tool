import { TaxRate } from '../../types'

// 税計算のロジック。main 側（main/ipc/taxCalc.ts）にも同一の実装があり、
// tests/unit/tax.test.ts で両者が一致することを検証している。
// Nextron の main / renderer は webpack が分かれており共有モジュールを跨げないため、
// 意図的に実装を二重化している。片方を変更したら必ずもう片方も揃えること。

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(amount)

/**
 * 消費税額の端数処理。四捨五入を採用する。
 * インボイス制度では端数処理の方法（切上げ・切捨て・四捨五入）を事業者が選択できる
 * （国税庁 タックスアンサー No.6371）。税込でキリのよい請求額を組めるよう四捨五入とする。
 * 切り捨てでは税込12,000円ちょうどになる税抜額が存在しない（10,909→11,999 / 10,910→12,001）。
 */
export function roundTaxAmount(value: number): number {
  return Math.round(value)
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
 *
 * インボイス制度では消費税額の端数処理は「一の適格請求書につき、税率ごとに1回」
 * と定められている（国税庁 タックスアンサー No.6371）。行ごとに端数処理して
 * 合算せず、税率ごとに対価を合計してから1回だけ端数処理する。
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
    .sort((a, b) => b[0] - a[0]) // 10% → 8% → 0% の順
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

export interface LineCalc {
  subtotalExclTax: number
  /** 行ごとの参考税額。合計には buildTaxBreakdown を使うこと。 */
  taxAmount: number
  subtotalInclTax: number
}

export const calcLine = (
  quantity: number,
  unitPrice: number,
  taxRate: TaxRate,
  includeTax: boolean
): LineCalc => {
  const subtotalExclTax = lineSubtotalExclTax(quantity, unitPrice)
  const taxAmount = includeTax
    ? roundTaxAmount((subtotalExclTax * taxRate) / 100)
    : 0
  return {
    subtotalExclTax,
    taxAmount,
    subtotalInclTax: subtotalExclTax + taxAmount,
  }
}
