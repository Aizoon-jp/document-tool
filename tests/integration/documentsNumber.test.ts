import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDatabaseForTesting } from '../../main/db/client'
import { createClient } from '../../main/ipc/clients'
import {
  seedDefaultDocumentSettings,
  updateDocumentSetting,
} from '../../main/ipc/documentSettings'
import { getNextDocumentNumber } from '../../main/ipc/documentsNumber'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb
let close: () => void
let clientId: string

beforeEach(async () => {
  const ctx = createTestDb()
  db = ctx.db
  close = ctx.close
  setDatabaseForTesting(db)
  await seedDefaultDocumentSettings()
  const client = await createClient({
    name: 'テスト',
    honorific: '御中',
    postalCode: null,
    address: null,
    tel: null,
    contactPerson: null,
    contactDepartment: null,
    paymentTerms: null,
    defaultTaxCategory: 'taxable_10',
    notes: null,
  })
  clientId = client.id
})

afterEach(() => {
  setDatabaseForTesting(null)
  close()
})

describe('documents:next-number', () => {
  it('同月の書類ゼロなら seq=1 を返す', async () => {
    const result = await getNextDocumentNumber('invoice', undefined, new Date('2026-04-20'))
    expect(result.formatted).toBe('INV-2026-04-001')
    expect(result.sequence).toBe(1)
    expect(result.yearMonth).toBe('2026-04')
  })

  it('同月内に既存書類があれば最大+1', async () => {
    const { documents } = await import('../../main/db/schema')
    await db.insert(documents).values({
      id: 'd1',
      documentType: 'invoice',
      documentNumber: 'INV-2026-04-005',
      issueDate: '2026-04-10',
      clientId: clientId,
      options: '{}',
      detailMode: 'direct',
    })
    const result = await getNextDocumentNumber('invoice', undefined, new Date('2026-04-20'))
    expect(result.formatted).toBe('INV-2026-04-006')
    expect(result.sequence).toBe(6)
  })

  it('書類種別が異なれば独立してカウント', async () => {
    const { documents } = await import('../../main/db/schema')
    await db.insert(documents).values({
      id: 'd1',
      documentType: 'invoice',
      documentNumber: 'INV-2026-04-010',
      issueDate: '2026-04-10',
      clientId: clientId,
      options: '{}',
      detailMode: 'direct',
    })
    const receipt = await getNextDocumentNumber('receipt', undefined, new Date('2026-04-20')
    )
    expect(receipt.formatted).toBe('RCP-2026-04-001')
  })

  it('書類別設定が未登録ならエラー', async () => {
    const ctx = createTestDb()
    setDatabaseForTesting(ctx.db)
    await expect(
      getNextDocumentNumber('invoice', undefined, new Date('2026-04-20'))
    ).rejects.toThrow(/未登録/)
    ctx.close()
  })

  it('月をまたぐと seq が1にリセット', async () => {
    const { documents } = await import('../../main/db/schema')
    await db.insert(documents).values({
      id: 'd1',
      documentType: 'invoice',
      documentNumber: 'INV-2026-03-099',
      issueDate: '2026-03-31',
      clientId: clientId,
      options: '{}',
      detailMode: 'direct',
    })
    const result = await getNextDocumentNumber('invoice', undefined, new Date('2026-04-01'))
    expect(result.formatted).toBe('INV-2026-04-001')
  })

  it('カスタムフォーマットにも対応', async () => {
    await updateDocumentSetting('invoice', {
      documentType: 'invoice',
      numberFormat: 'TEST-{YYYY}{MM}-{seq:4}',
      defaultOptions: {
        includeTax: true,
        reducedTaxRate: true,
        withholdingTax: false,
        showRemarks: true,
        showBankInfo: true,
      },
      defaultRemarks: null,
    })
    const result = await getNextDocumentNumber('invoice', undefined, new Date('2026-04-20'))
    expect(result.formatted).toBe('TEST-202604-0001')
  })
})

// 2026-10-20 の実害: 前月に INV-2026-09-001 を発行した取引先で翌月に採番すると
// 末尾+1 で INV-2026-09-002 になり、別の取引先の書類と番号が重複してPDFまで上書きされた。
describe('documents:next-number 取引先の番号追従', () => {
  async function insertDoc(id: string, documentNumber: string, ownerId: string) {
    const { documents } = await import('../../main/db/schema')
    await db.insert(documents).values({
      id,
      documentType: 'invoice',
      documentNumber,
      issueDate: '2026-09-20',
      clientId: ownerId,
      options: '{}',
      detailMode: 'direct',
    })
  }

  async function createOtherClient(): Promise<string> {
    const other = await createClient({
      name: '他社',
      honorific: '御中',
      postalCode: null,
      address: null,
      tel: null,
      contactPerson: null,
      contactDepartment: null,
      paymentTerms: null,
      defaultTaxCategory: 'taxable_10',
      notes: null,
    })
    return other.id
  }

  it('前月の書式番号は追従せず、今月の全社連番になる', async () => {
    const otherId = await createOtherClient()
    await insertDoc('d1', 'INV-2026-09-001', clientId)
    await insertDoc('d2', 'INV-2026-09-002', otherId)
    const result = await getNextDocumentNumber('invoice', clientId, new Date('2026-10-20'))
    expect(result.formatted).toBe('INV-2026-10-001')
  })

  it('取引先の独自番号は末尾+1 で追従する', async () => {
    await insertDoc('d1', 'KIBA-012', clientId)
    const result = await getNextDocumentNumber('invoice', clientId, new Date('2026-10-20'))
    expect(result.formatted).toBe('KIBA-013')
  })

  it('追従先が他社で使用済みなら全社連番に切り替える', async () => {
    const otherId = await createOtherClient()
    await insertDoc('d1', 'SHARED-001', clientId)
    await insertDoc('d2', 'SHARED-002', otherId)
    const result = await getNextDocumentNumber('invoice', clientId, new Date('2026-10-20'))
    expect(result.formatted).toBe('INV-2026-10-001')
  })
})
