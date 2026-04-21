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
    const result = await getNextDocumentNumber('invoice', new Date('2026-04-20'))
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
    const result = await getNextDocumentNumber('invoice', new Date('2026-04-20'))
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
    const receipt = await getNextDocumentNumber(
      'receipt',
      new Date('2026-04-20')
    )
    expect(receipt.formatted).toBe('RCP-2026-04-001')
  })

  it('書類別設定が未登録ならエラー', async () => {
    const ctx = createTestDb()
    setDatabaseForTesting(ctx.db)
    await expect(
      getNextDocumentNumber('invoice', new Date('2026-04-20'))
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
    const result = await getNextDocumentNumber('invoice', new Date('2026-04-01'))
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
    const result = await getNextDocumentNumber('invoice', new Date('2026-04-20'))
    expect(result.formatted).toBe('TEST-202604-0001')
  })
})
