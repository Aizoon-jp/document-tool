import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDatabaseForTesting } from '../../main/db/client'
import { getCompany, updateCompany } from '../../main/ipc/company'
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

describe('company IPC', () => {
  it('未登録時は null を返す', async () => {
    expect(await getCompany()).toBeNull()
  })

  it('update で新規登録される', async () => {
    const company = await updateCompany({
      name: '株式会社テスト',
      tradeName: null,
      postalCode: '100-0001',
      address: '東京都',
      tel: '03-0000-0000',
      fax: null,
      email: null,
      website: null,
      representativeName: null,
      invoiceNumber: null,
      bankName: null,
      bankBranch: null,
      bankAccountType: null,
      bankAccountNumber: null,
      bankAccountHolderKana: null,
    })
    expect(company.name).toBe('株式会社テスト')
    expect(company.id).toBeTruthy()

    const fetched = await getCompany()
    expect(fetched?.id).toBe(company.id)
    expect(fetched?.postalCode).toBe('100-0001')
  })

  it('update は既存レコードを更新する', async () => {
    const created = await updateCompany({
      name: '株式会社旧',
      tradeName: null,
      postalCode: null,
      address: null,
      tel: null,
      fax: null,
      email: null,
      website: null,
      representativeName: null,
      invoiceNumber: null,
      bankName: null,
      bankBranch: null,
      bankAccountType: null,
      bankAccountNumber: null,
      bankAccountHolderKana: null,
    })
    const updated = await updateCompany({
      name: '株式会社新',
      tradeName: '新商号',
      postalCode: null,
      address: null,
      tel: null,
      fax: null,
      email: null,
      website: null,
      representativeName: null,
      invoiceNumber: null,
      bankName: null,
      bankBranch: null,
      bankAccountType: null,
      bankAccountNumber: null,
      bankAccountHolderKana: null,
    })
    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('株式会社新')
    expect(updated.tradeName).toBe('新商号')
  })
})
