import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDatabaseForTesting } from '../../main/db/client'
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from '../../main/ipc/items'
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

const input = {
  name: 'Webサイト制作',
  unitPrice: 500_000,
  unit: '式',
  taxRate: 10 as const,
  isReducedTaxRate: false,
  defaultQuantity: 1,
  notes: null,
}

describe('items IPC', () => {
  it('create -> list -> get -> update -> delete', async () => {
    const created = await createItem(input)
    expect(created.name).toBe('Webサイト制作')
    expect(created.unitPrice).toBe(500_000)

    const list = await listItems()
    expect(list).toHaveLength(1)

    const fetched = await getItem(created.id)
    expect(fetched?.taxRate).toBe(10)

    const updated = await updateItem(created.id, {
      ...input,
      name: '保守運用',
      unitPrice: 30_000,
      taxRate: 8,
      isReducedTaxRate: true,
    })
    expect(updated.name).toBe('保守運用')
    expect(updated.taxRate).toBe(8)
    expect(updated.isReducedTaxRate).toBe(true)

    await deleteItem(created.id)
    expect(await listItems()).toHaveLength(0)
  })

  it('存在しないIDの update はエラー', async () => {
    await expect(updateItem('notfound', input)).rejects.toThrow(/not found/i)
  })
})
