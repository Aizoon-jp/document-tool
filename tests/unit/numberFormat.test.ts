import { describe, expect, it } from 'vitest'
import { formatNumber } from '../../main/ipc/documentsNumber'

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
