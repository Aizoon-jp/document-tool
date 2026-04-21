import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDatabaseForTesting } from '../../main/db/client'
import {
  listDocumentSettings,
  seedDefaultDocumentSettings,
  updateDocumentSetting,
} from '../../main/ipc/documentSettings'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb
let close: () => void

beforeEach(() => {
  const ctx = createTestDb()
  db = ctx.db
  close = ctx.close
  setDatabaseForTesting(db)
})

afterEach(() => {
  setDatabaseForTesting(null)
  close()
})

describe('document-settings IPC', () => {
  it('seed で5書類種別が初期登録される', async () => {
    await seedDefaultDocumentSettings()
    const list = await listDocumentSettings()
    expect(list).toHaveLength(5)
    const types = list.map((s) => s.documentType).sort()
    expect(types).toEqual([
      'delivery_note',
      'invoice',
      'payment_request',
      'quote',
      'receipt',
    ])

    const invoice = list.find((s) => s.documentType === 'invoice')!
    expect(invoice.numberFormat).toBe('INV-{YYYY}-{MM}-{seq:3}')
    expect(invoice.defaultOptions.includeTax).toBe(true)
  })

  it('update で upsert される', async () => {
    const setting = await updateDocumentSetting('invoice', {
      documentType: 'invoice',
      numberFormat: 'INV-{YYYY}-{seq:4}',
      defaultOptions: {
        includeTax: true,
        reducedTaxRate: true,
        withholdingTax: true,
        showRemarks: false,
        showBankInfo: true,
      },
      defaultRemarks: 'テスト備考',
    })
    expect(setting.numberFormat).toBe('INV-{YYYY}-{seq:4}')
    expect(setting.defaultOptions.withholdingTax).toBe(true)
    expect(setting.defaultRemarks).toBe('テスト備考')

    // 再度 update で差し替え
    const updated = await updateDocumentSetting('invoice', {
      documentType: 'invoice',
      numberFormat: 'INV-X-{seq:3}',
      defaultOptions: {
        includeTax: false,
        reducedTaxRate: false,
        withholdingTax: false,
        showRemarks: true,
        showBankInfo: false,
      },
      defaultRemarks: null,
    })
    expect(updated.id).toBe(setting.id)
    expect(updated.numberFormat).toBe('INV-X-{seq:3}')
  })
})
