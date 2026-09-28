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
    // 税抜105円の行を3つ。行ごとに round(10.5)=11 を合計すると33になるが、
    // 正しくは 315×10%=31.5 → 32。行ごと合算(33)とは1円ずれる。
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
    expect(breakdown[0].taxAmount).toBe(32) // 行ごと端数処理の合計(33)ではない
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

  it('8%も税率ごとに合計してから四捨五入する', () => {
    // 107 × 8% = 8.56 → 9。切り捨てなら 8 で、floor と round が割れる最小級のケース。
    const breakdown = buildTaxBreakdown([{ taxRate: 8, amount: 107 }], true)
    expect(breakdown[0].taxAmount).toBe(9)
  })

  it('8%と10%が同時に端数を持つ場合も、税率ごとに1回ずつ端数処理する', () => {
    const breakdown = buildTaxBreakdown(
      [
        { taxRate: 10, amount: 1_005 },
        { taxRate: 8, amount: 1_007 },
      ],
      true
    )
    expect(breakdown.find((e) => e.taxRate === 10)?.taxAmount).toBe(101) // 100.5 → 101
    expect(breakdown.find((e) => e.taxRate === 8)?.taxAmount).toBe(81) // 80.56 → 81
    expect(sumTaxAmount(breakdown)).toBe(182)
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
  it('四捨五入', () => {
    expect(roundTaxAmount(99.4)).toBe(99)
    expect(roundTaxAmount(99.5)).toBe(100)
    expect(roundTaxAmount(99.9)).toBe(100)
    expect(roundTaxAmount(100)).toBe(100)
  })

  it('税込でキリのよい請求額を組める（切り捨てでは到達できなかった額）', () => {
    // 税抜10,909 → 消費税1,091 → 税込12,000ちょうど。
    // 切り捨てだと1,090で11,999、税抜10,910にすると12,001。12,000は作れなかった。
    expect(10_909 + roundTaxAmount(10_909 * 0.1)).toBe(12_000)
  })

  it('端数が .5 未満なら切り捨てと四捨五入で結果が変わらない', () => {
    // 15,152 は実際に発行済みの請求書の税抜額（1515.2）。818.2 も同様に両者一致する。
    expect(roundTaxAmount(8_182 * 0.1)).toBe(818)
    expect(roundTaxAmount(15_152 * 0.1)).toBe(1_515)
  })

  it('負値では0を挟んで非対称に丸まる（仕様上、負の対価は発生しない）', () => {
    // Math.round は常に +∞ 方向へ丸めるため、切り捨て時代の -11 とは結果が変わる。
    expect(roundTaxAmount(-10.5)).toBe(-10)
    // -0 になるため、formatCurrency を通すと「-￥0」と表示されてしまう。
    expect(Object.is(roundTaxAmount(-0.4), -0)).toBe(true)
  })
})

describe('税込入力からの往復（DocumentLinesField の AmountInput と同じ逆算式）', () => {
  // AmountInput は税込入力を `Math.round(税込 / (1 + 税率/100) / 数量)` で単価に逆算する
  // （renderer/components/documents/DocumentLinesField.tsx）。その往復を固定する。
  const toUnitPrice = (inclTax: number, taxRate: number): number =>
    Math.round(inclTax / (1 + taxRate / 100))

  it('税込12,000円ちょうどを組める（切り捨てでは到達できなかった）', () => {
    const exclTax = toUnitPrice(12_000, 10)
    expect(exclTax).toBe(10_909)
    expect(exclTax + roundTaxAmount(exclTax * 0.1)).toBe(12_000)
  })

  it('往復が一致しない額は残る。四捨五入では入力額より1円高く出る', () => {
    // 10% では税込 T が T ≡ 5 (mod 11) のとき往復がズレる。
    // 切り捨て時代は1円安く出ていたが、四捨五入では1円高く出る方向に変わった。
    const exclTax = toUnitPrice(5, 10) // 4.54… → 5
    expect(exclTax + roundTaxAmount(exclTax * 0.1)).toBe(6)
  })

  it('複数行では各行を税込で組んでも合計が狙い値にならないことがある', () => {
    // 税率ごとに合計してから1回だけ端数処理する正しい仕様（インボイス制度）の帰結。
    // 税込1,003円を3行 → 単価912 / 税抜2,736 / 税274 / 合計3,010。狙いの3,009より1円高い。
    // 1,000円以上ではこれが最小の不一致例（実測で全数走査して確認）。
    const unitPrice = toUnitPrice(1_003, 10)
    expect(unitPrice).toBe(912)
    const breakdown = buildTaxBreakdown(
      [1, 2, 3].map(() => ({ taxRate: 10 as const, amount: unitPrice })),
      true
    )
    expect(breakdown[0].taxableAmount).toBe(2_736)
    expect(breakdown[0].taxAmount).toBe(274)
    const total = breakdown[0].taxableAmount + breakdown[0].taxAmount
    expect(total).toBe(3_010)
    expect(total).not.toBe(1_003 * 3)
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
