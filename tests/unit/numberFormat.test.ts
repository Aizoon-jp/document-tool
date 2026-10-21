import { describe, expect, it } from 'vitest'
import { formatNumber, matchesNumberFormat } from '../../main/ipc/documentsNumber'

describe('formatNumber', () => {
  it('YYYY / MM / seq:N プレースホルダを展開する', () => {
    expect(formatNumber('INV-{YYYY}-{MM}-{seq:3}', '2026', '04', 7)).toBe(
      'INV-2026-04-007'
    )
  })

  it('seq:1 は1桁で出力', () => {
    expect(formatNumber('X-{seq:1}', '2026', '01', 9)).toBe('X-9')
  })

  it('seq なしフォーマット（{seq}）もサポート', () => {
    expect(formatNumber('X-{YYYY}-{seq}', '2026', '01', 42)).toBe('X-2026-42')
  })

  it('大きな連番もゼロ埋め', () => {
    expect(formatNumber('RCP-{YYYY}-{MM}-{seq:4}', '2026', '12', 12)).toBe(
      'RCP-2026-12-0012'
    )
  })
})

describe('matchesNumberFormat', () => {
  const format = 'INV-{YYYY}-{MM}-{seq:3}'

  it('書式から採番した番号は一致する（月をまたいで追従させない対象）', () => {
    expect(matchesNumberFormat(format, 'INV-2026-09-001')).toBe(true)
    expect(matchesNumberFormat(format, 'INV-2026-12-1000')).toBe(true)
  })

  it('取引先の独自番号は一致しない（末尾+1 で追従する対象）', () => {
    expect(matchesNumberFormat(format, 'KIBA-012')).toBe(false)
    expect(matchesNumberFormat(format, 'INV-2026-09-001-A')).toBe(false)
    expect(matchesNumberFormat(format, 'RCP-2026-09-001')).toBe(false)
  })

  it('書式内の記号は正規表現として解釈しない', () => {
    expect(matchesNumberFormat('No.{seq}', 'No.5')).toBe(true)
    expect(matchesNumberFormat('No.{seq}', 'NoX5')).toBe(false)
  })
})
