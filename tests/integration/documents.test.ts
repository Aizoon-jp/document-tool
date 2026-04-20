import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setDatabaseForTesting } from '../../main/db/client'
import { createClient } from '../../main/ipc/clients'
import { seedDefaultDocumentSettings } from '../../main/ipc/documentSettings'
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  getDocument,
  getDocumentLines,
  getMonthlySummary,
  listDocuments,
  listRecentDocuments,
  searchDocuments,
  updateDocument,
} from '../../main/ipc/documents'
import { createTestDb, type TestDb } from '../helpers/testDb'
import type { DocumentDraft } from '../../renderer/types'

let db: TestDb
let close: () => void
let clientId: string

const baseOptions = {
  includeTax: true,
  reducedTaxRate: true,
  withholdingTax: false,
  showRemarks: true,
  showBankInfo: true,
}

function draft(
  overrides: Partial<DocumentDraft> = {}
): DocumentDraft {
  return {
    documentType: 'invoice',
    documentNumber: 'INV-2026-04-001',
    issueDate: '2026-04-20',
    clientId,
    detailMode: 'direct',
    externalAmount: 0,
    options: baseOptions,
    stampIds: [],
    remarks: '',
    lines: [
      {
        itemId: null,
        content: 'Webサイト制作',
        quantity: 1,
        unit: '式',
        unitPrice: 100_000,
        taxRate: 10,
        isReducedTaxRate: false,
      },
    ],
    ...overrides,
  }
}

beforeEach(async () => {
  const ctx = createTestDb()
  db = ctx.db
  close = ctx.close
  setDatabaseForTesting(db)
  await seedDefaultDocumentSettings()
  const client = await createClient({
    name: '株式会社サンプル',
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

describe('documents:create', () => {
  it('明細付き書類を作成し金額を再計算する', async () => {
    const doc = await createDocument(draft())
    expect(doc.subtotal).toBe(100_000)
    expect(doc.taxAmount).toBe(10_000)
    expect(doc.totalAmount).toBe(110_000)
    expect(doc.clientName).toBe('株式会社サンプル')

    const lines = await getDocumentLines(doc.id)
    expect(lines).toHaveLength(1)
    expect(lines[0].lineNumber).toBe(1)
    expect(lines[0].subtotalInclTax).toBe(110_000)
  })

  it('外部合計モードでは明細なしで totalAmount=externalAmount', async () => {
    const doc = await createDocument(
      draft({ detailMode: 'external', externalAmount: 55_000, lines: [] })
    )
    expect(doc.subtotal).toBe(55_000)
    expect(doc.totalAmount).toBe(55_000)
    expect(await getDocumentLines(doc.id)).toHaveLength(0)
  })
})

describe('documents:update', () => {
  it('明細を全差し替えし金額を再計算', async () => {
    const doc = await createDocument(draft())
    const updated = await updateDocument(doc.id, {
      ...draft(),
      lines: [
        {
          itemId: null,
          content: '新品目A',
          quantity: 2,
          unit: '式',
          unitPrice: 50_000,
          taxRate: 10,
          isReducedTaxRate: false,
        },
        {
          itemId: null,
          content: '新品目B',
          quantity: 1,
          unit: '個',
          unitPrice: 10_000,
          taxRate: 8,
          isReducedTaxRate: true,
        },
      ],
    })
    expect(updated.subtotal).toBe(110_000)
    expect(updated.taxAmount).toBe(10_000 + 800)
    const lines = await getDocumentLines(doc.id)
    expect(lines).toHaveLength(2)
    expect(lines.find((l) => l.content === '新品目A')?.subtotalExclTax).toBe(
      100_000
    )
  })

  it('存在しないIDならエラー', async () => {
    await expect(updateDocument('nope', draft())).rejects.toThrow(/not found/i)
  })
})

describe('documents:delete', () => {
  it('書類削除時に明細もカスケード削除される', async () => {
    const doc = await createDocument(draft())
    expect(await getDocumentLines(doc.id)).toHaveLength(1)
    await deleteDocument(doc.id)
    expect(await getDocument(doc.id)).toBeNull()
    expect(await getDocumentLines(doc.id)).toHaveLength(0)
  })
})

describe('documents:duplicate', () => {
  it('番号は新規採番、明細はコピーされる', async () => {
    const source = await createDocument(draft())
    const copied = await duplicateDocument(source.id)
    expect(copied.id).not.toBe(source.id)
    expect(copied.documentNumber).not.toBe(source.documentNumber)
    expect(copied.clientId).toBe(source.clientId)

    const copiedLines = await getDocumentLines(copied.id)
    expect(copiedLines).toHaveLength(1)
    expect(copiedLines[0].content).toBe('Webサイト制作')
  })
})

describe('documents:list / search / summary', () => {
  beforeEach(async () => {
    await createDocument(
      draft({ documentNumber: 'INV-2026-04-001', issueDate: '2026-04-01' })
    )
    await createDocument(
      draft({
        documentType: 'receipt',
        documentNumber: 'RCP-2026-04-001',
        issueDate: '2026-04-15',
      })
    )
    await createDocument(
      draft({
        documentNumber: 'INV-2026-03-009',
        issueDate: '2026-03-20',
      })
    )
  })

  it('listDocuments は全件', async () => {
    const list = await listDocuments()
    expect(list).toHaveLength(3)
  })

  it('listRecentDocuments は issueDate 降順 N件', async () => {
    const recent = await listRecentDocuments(2)
    expect(recent).toHaveLength(2)
    expect(recent[0].issueDate).toBe('2026-04-15')
    expect(recent[1].issueDate).toBe('2026-04-01')
  })

  it('searchDocuments: documentType フィルタ', async () => {
    const invoices = await searchDocuments({ documentType: 'invoice' })
    expect(invoices.every((d) => d.documentType === 'invoice')).toBe(true)
    expect(invoices).toHaveLength(2)
  })

  it('searchDocuments: 期間フィルタ', async () => {
    const apr = await searchDocuments({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    })
    expect(apr).toHaveLength(2)
  })

  it('searchDocuments: 取引先名部分一致', async () => {
    const hits = await searchDocuments({ clientName: 'サンプル' })
    expect(hits).toHaveLength(3)
    const miss = await searchDocuments({ clientName: '存在しない' })
    expect(miss).toHaveLength(0)
  })

  it('monthlySummary は書類種別ごとに集計', async () => {
    const apr = await getMonthlySummary('2026-04')
    expect(apr.totalCount).toBe(2)
    expect(apr.breakdown.invoice).toBe(1)
    expect(apr.breakdown.receipt).toBe(1)

    const mar = await getMonthlySummary('2026-03')
    expect(mar.totalCount).toBe(1)
    expect(mar.breakdown.invoice).toBe(1)
  })
})
