import { describe, expect, it } from 'vitest'
import {
  buildTaxBreakdown,
  calcWithholdingTax,
  lineSubtotalExclTax,
  roundTaxAmount,
  sumTaxAmount,
} from '../../main/ipc/taxCalc'
import * as rendererCalc from '../../renderer/components/documents/utils'

describe('lineSubtotalExclTax', () => {
  it('数量×単価の端数を切り捨てる', () => {
    expect(lineSubtotalExclTax(2, 100_000)).toBe(200_000)
    expect(lineSubtotalExclTax(0.33, 1_000)).toBe(330)
    expect(lineSubtotalExclTax(3, 33.3)).toBe(99) // floor(99.9)
  })
})

describe('buildTaxBreakdown（インボイス制度：税率ごとに1回端数処理）', () => {
  it('税率ごとに対価を合計してから一度だけ端数処理する', () => {
    // 税抜105円の行を3つ。行ごとに floor(10.5)=10 を合計すると30になるが、
    // 正しくは 315×10%=31.5 → 31。行ごと合算(30)とは1円ずれる。
    const breakdown = buildTaxBreakdown(
      [
        { taxRate: 10, amount: 105 },
        { taxRate: 10, amount: 105 },
        { taxRate: 10, amount: 105 },
      ],
      true
    )
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].taxableAmount).toBe(315)
    expect(breakdown[0].taxAmount).toBe(31) // 30 ではない
  })

  it('複数税率を区分する（10%→8%の順）', () => {
    const breakdown = buildTaxBreakdown(
      [
        { taxRate: 8, amount: 10_000 },
        { taxRate: 10, amount: 20_000 },
        { taxRate: 8, amount: 5_000 },
      ],
      true
    )
    expect(breakdown).toHaveLength(2)
    expect(breakdown[0]).toEqual({
      taxRate: 10,
      taxableAmount: 20_000,
      taxAmount: 2_000,
    })
    expect(breakdown[1]).toEqual({
      taxRate: 8,
      taxableAmount: 15_000,
      taxAmount: 1_200,
    })
  })

  it('includeTax=false なら消費税額は常に0', () => {
    const breakdown = buildTaxBreakdown([{ taxRate: 10, amount: 20_000 }], false)
    expect(breakdown[0].taxAmount).toBe(0)
    expect(sumTaxAmount(breakdown)).toBe(0)
  })

  it('0%（非課税）区分は消費税額0で区分される', () => {
    const breakdown = buildTaxBreakdown(
      [
        { taxRate: 10, amount: 20_000 },
        { taxRate: 0, amount: 5_000 },
      ],
      true
    )
    const zero = breakdown.find((e) => e.taxRate === 0)
    expect(zero?.taxAmount).toBe(0)
    expect(sumTaxAmount(breakdown)).toBe(2_000)
  })
})

describe('roundTaxAmount', () => {
  it('切り捨て', () => {
    expect(roundTaxAmount(99.9)).toBe(99)
    expect(roundTaxAmount(100)).toBe(100)
  })
})

describe('calcWithholdingTax（源泉徴収税）', () => {
  it('100万円以下は10.21%（小数切捨て）', () => {
    expect(calcWithholdingTax(500_000)).toBe(51_050)
    expect(calcWithholdingTax(1_000_000)).toBe(102_100)
  })

  it('0以下は0', () => {
    expect(calcWithholdingTax(0)).toBe(0)
    expect(calcWithholdingTax(-1)).toBe(0)
  })

  it('100万円超は超過部分20.42% + 102,100円（累進）', () => {
    // 旧・一律10.21%の画面実装だと 200万→204,200 になっていた。累進では倍近い。
    expect(calcWithholdingTax(2_000_000)).toBe(306_300)
    expect(calcWithholdingTax(3_000_000)).toBe(510_500)
    expect(calcWithholdingTax(1_500_000)).toBe(
      102_100 + Math.floor(500_000 * 0.2042)
    )
  })
})

describe('main と renderer の実装が一致する（二重実装のズレ検出）', () => {
  const cases: { taxRate: 10 | 8 | 0; amount: number }[][] = [
    [{ taxRate: 10, amount: 300_315 }],
    [
      { taxRate: 10, amount: 20_000 },
      { taxRate: 8, amount: 15_003 },
      { taxRate: 0, amount: 5_000 },
    ],
    [
      { taxRate: 10, amount: 105 },
      { taxRate: 10, amount: 105 },
      { taxRate: 10, amount: 105 },
    ],
  ]

  it('buildTaxBreakdown が一致する', () => {
    for (const lines of cases) {
      expect(rendererCalc.buildTaxBreakdown(lines, true)).toEqual(
        buildTaxBreakdown(lines, true)
      )
    }
  })

  it('calcWithholdingTax が一致する', () => {
    for (const amount of [
      0, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000,
    ]) {
      expect(rendererCalc.calcWithholdingTax(amount)).toBe(
        calcWithholdingTax(amount)
      )
    }
  })

  it('lineSubtotalExclTax が一致する', () => {
    for (const [q, p] of [
      [2, 100_000],
      [3, 33.3],
      [0.33, 1_000],
    ]) {
      expect(rendererCalc.lineSubtotalExclTax(q, p)).toBe(
        lineSubtotalExclTax(q, p)
      )
    }
  })
})
