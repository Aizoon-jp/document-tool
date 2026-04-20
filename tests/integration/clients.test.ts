import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDatabaseForTesting } from '../../main/db/client'
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from '../../main/ipc/clients'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb
let close: () => void

const baseInput = {
  name: '株式会社サンプル',
  honorific: '御中' as const,
  postalCode: '100-0001',
  address: '東京都',
  tel: '03-0000-0000',
  contactPerson: '山田太郎',
  contactDepartment: '総務部',
  paymentTerms: '月末締め翌月末払い',
  defaultTaxCategory: 'taxable_10' as const,
  notes: null,
}

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

describe('clients IPC', () => {
  it('create -> list -> get -> update -> delete', async () => {
    expect(await listClients()).toHaveLength(0)

    const created = await createClient(baseInput)
    expect(created.id).toBeTruthy()
    expect(created.name).toBe('株式会社サンプル')

    const list1 = await listClients()
    expect(list1).toHaveLength(1)

    const fetched = await getClient(created.id)
    expect(fetched?.name).toBe('株式会社サンプル')

    const updated = await updateClient(created.id, {
      ...baseInput,
      name: '株式会社 新名',
      honorific: '様',
    })
    expect(updated.name).toBe('株式会社 新名')
    expect(updated.honorific).toBe('様')

    await deleteClient(created.id)
    expect(await listClients()).toHaveLength(0)
    expect(await getClient(created.id)).toBeNull()
  })

  it('存在しないIDの update はエラー', async () => {
    await expect(updateClient('notfound', baseInput)).rejects.toThrow(
      /not found/i
    )
  })

  it('書類から参照されていると削除不可', async () => {
    const client = await createClient(baseInput)
    const { documents } = await import('../../main/db/schema')
    await db.insert(documents).values({
      id: 'd1',
      documentType: 'invoice',
      documentNumber: 'X-001',
      issueDate: '2026-04-20',
      clientId: client.id,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      withholdingTax: 0,
      options: '{}',
      detailMode: 'direct',
    })

    await expect(deleteClient(client.id)).rejects.toThrow(/参照/)
  })
})
