import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { schema, setDatabaseForTesting } from '../../main/db/client'
import { seedDefaultDocumentSettings } from '../../main/ipc/documentSettings'
import { updateCompany } from '../../main/ipc/company'
import { createMcpServer } from '../../main/mcp/server'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb
let closeDb: () => void
let client: Client
const generatePdf = vi.fn(async (id: string) => ({ filePath: `/tmp/${id}.pdf` }))

interface ToolResult {
  isError?: boolean
  content: { type: string; text: string }[]
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as ToolResult
  const text = res.content[0].text
  return { isError: res.isError === true, text, json: () => JSON.parse(text) }
}

const line = { content: 'Webサイト制作', quantity: 1, unitPrice: 100_000 }

async function newClient(name = '株式会社サンプル') {
  return (await call('create_client', { name })).json()
}

beforeEach(async () => {
  const ctx = createTestDb()
  db = ctx.db
  closeDb = ctx.close
  setDatabaseForTesting(db)
  await seedDefaultDocumentSettings()
  generatePdf.mockClear()

  const server = createMcpServer({ generatePdf }, '0.0.0-test')
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'test', version: '0' })
  await Promise.all([server.connect(serverSide), client.connect(clientSide)])
})

afterEach(async () => {
  await client.close()
  setDatabaseForTesting(null)
  closeDb()
})

describe('mcp: ツール一覧', () => {
  it('仕様のツールだけを公開し、削除系は含まない', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual([
      'calculate_totals',
      'create_client',
      'create_document',
      'generate_pdf',
      'get_company',
      'get_document',
      'list_clients',
      'list_items',
      'list_stamps',
      'search_documents',
      'update_document',
    ])
    expect(tools.every((t) => !/delete|remove/.test(t.name))).toBe(true)
  })

  it('instructions に運用ルールが入っている', () => {
    expect(client.getInstructions()).toContain('税抜単価')
    expect(client.getInstructions()).toContain('calculate_totals')
  })
})

describe('mcp: マスタ参照', () => {
  it('get_company は未登録なら null、登録後は内容を返す', async () => {
    expect((await call('get_company')).json()).toBeNull()
    await updateCompany({
      name: 'Aizoon合同会社',
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
    expect((await call('get_company')).json().name).toBe('Aizoon合同会社')
  })

  it('create_client の既定値と list_clients', async () => {
    const created = await newClient()
    expect(created.honorific).toBe('御中')
    expect(created.defaultTaxCategory).toBe('taxable_10')
    const list = (await call('list_clients')).json()
    expect(list.map((c: { id: string }) => c.id)).toEqual([created.id])
  })

  it('list_stamps は id・name・isDefault だけを返す', async () => {
    await db.insert(schema.stamps).values({ id: 's1', name: '角印', imagePath: '/x/y.png', isDefault: true })
    expect((await call('list_stamps')).json()).toEqual([{ id: 's1', name: '角印', isDefault: true }])
  })

  it('list_items は空配列を返す', async () => {
    expect((await call('list_items')).json()).toEqual([])
  })
})

describe('mcp: calculate_totals', () => {
  it('保存せずに税率別に1回だけ四捨五入した金額を返す', async () => {
    const res = (
      await call('calculate_totals', {
        documentType: 'invoice',
        lines: [
          { content: 'A', quantity: 1, unitPrice: 1003 },
          { content: 'B', quantity: 1, unitPrice: 1003 },
          { content: 'C', quantity: 1, unitPrice: 1003 },
        ],
      })
    ).json()
    expect(res.subtotal).toBe(3009)
    expect(res.taxAmount).toBe(301) // 3009 * 10% = 300.9 → 301（行ごとの 100 × 3 = 300 ではない）
    expect(res.totalAmount).toBe(3310)
    expect((await call('search_documents')).json().total).toBe(0)
  })

  it('options で源泉徴収を有効にできる', async () => {
    const res = (
      await call('calculate_totals', {
        documentType: 'invoice',
        lines: [line],
        options: { withholdingTax: true },
      })
    ).json()
    expect(res.withholdingTax).toBeGreaterThan(0)
  })
})

describe('mcp: create_document', () => {
  it('自動採番・既定オプションで作成しPDFを生成する', async () => {
    const c = await newClient()
    const res = (
      await call('create_document', {
        documentType: 'invoice',
        clientId: c.id,
        issueDate: '2026-04-20',
        lines: [line],
      })
    ).json()
    expect(res.document.documentNumber).toMatch(/^INV-/)
    expect(res.document.subtotal).toBe(100_000)
    expect(res.document.totalAmount).toBe(110_000)
    expect(res.document.detailMode).toBe('direct')
    expect(res.lines).toHaveLength(1)
    expect(res.lines[0]).toMatchObject({ unit: '式', taxRate: 10, isReducedTaxRate: false })
    expect(generatePdf).toHaveBeenCalledWith(res.document.id)
  })

  it('連続作成すると番号が重ならない', async () => {
    const c = await newClient()
    const make = async () =>
      (
        await call('create_document', {
          documentType: 'invoice',
          clientId: c.id,
          issueDate: '2026-04-20',
          lines: [line],
          generatePdf: false,
        })
      ).json().document.documentNumber
    const [a, b] = [await make(), await make()]
    expect(a).not.toBe(b)
    expect(generatePdf).not.toHaveBeenCalled()
  })

  it('備考があると showRemarks が true になる／既定の角印が付く', async () => {
    const c = await newClient()
    await db.insert(schema.stamps).values({ id: 's1', name: '角印', imagePath: '/x/y.png', isDefault: true })
    const res = (
      await call('create_document', {
        documentType: 'quote',
        clientId: c.id,
        issueDate: '2026-04-20',
        lines: [line],
        remarks: '納期は2週間',
        options: { showRemarks: undefined, showBankInfo: false },
        generatePdf: false,
      })
    ).json()
    expect(res.document.options.showRemarks).toBe(true)
    expect(res.document.options.showBankInfo).toBe(false)
    expect(res.document.remarks).toBe('納期は2週間')
    expect(res.document.stampId).toBe('s1')
  })

  it('PDF生成が失敗しても書類は保存され pdfError を返す', async () => {
    generatePdf.mockRejectedValueOnce(new Error('boom'))
    const c = await newClient()
    const res = await call('create_document', {
      documentType: 'invoice',
      clientId: c.id,
      issueDate: '2026-04-20',
      lines: [line],
    })
    expect(res.isError).toBe(false)
    expect(res.json().pdfError).toContain('boom')
    expect((await call('search_documents')).json().total).toBe(1)
  })

  it('同じ書類番号は拒否される', async () => {
    const c = await newClient()
    const args = {
      documentType: 'invoice',
      clientId: c.id,
      issueDate: '2026-04-20',
      lines: [line],
      documentNumber: 'X-1',
      generatePdf: false,
    }
    expect((await call('create_document', args)).isError).toBe(false)
    const dup = await call('create_document', args)
    expect(dup.isError).toBe(true)
    expect(dup.text).toContain('X-1')
  })

  it('存在しない取引先・角印は日本語エラー', async () => {
    const c = await newClient()
    const base = { documentType: 'invoice', issueDate: '2026-04-20', lines: [line], generatePdf: false }
    const noClient = await call('create_document', { ...base, clientId: 'nope' })
    expect(noClient.isError).toBe(true)
    expect(noClient.text).toContain('取引先が見つかりません')
    const noStamp = await call('create_document', { ...base, clientId: c.id, stampIds: ['nope'] })
    expect(noStamp.isError).toBe(true)
    expect(noStamp.text).toContain('角印が見つかりません')
  })
})

describe('mcp: 入力検証', () => {
  const bad = async (patch: Record<string, unknown>) => {
    const c = await newClient()
    return call('create_document', {
      documentType: 'invoice',
      clientId: c.id,
      issueDate: '2026-04-20',
      lines: [line],
      generatePdf: false,
      ...patch,
    })
  }

  it.each([
    ['日付形式', { issueDate: '2026/04/20' }],
    ['存在しない日付', { issueDate: '2026-02-30' }],
    ['税率の値域', { lines: [{ ...line, taxRate: 5 }] }],
    ['数量0', { lines: [{ ...line, quantity: 0 }] }],
    ['数量が負', { lines: [{ ...line, quantity: -1 }] }],
    ['明細なし', { lines: [] }],
    ['書類種別', { documentType: 'memo' }],
  ])('%s は isError になり、何も保存されない', async (_name, patch) => {
    const res = await bad(patch)
    expect(res.isError).toBe(true)
    expect((await call('search_documents')).json().total).toBe(0)
  })
})

describe('mcp: 検索・取得・更新', () => {
  it('search_documents で取引先名・期間・種別を絞り込める', async () => {
    const a = await newClient('株式会社アルファ')
    const b = await newClient('株式会社ベータ')
    const mk = (clientId: string, documentType: string, issueDate: string) =>
      call('create_document', { documentType, clientId, issueDate, lines: [line], generatePdf: false })
    await mk(a.id, 'invoice', '2026-03-10')
    await mk(a.id, 'quote', '2026-04-10')
    await mk(b.id, 'invoice', '2026-04-20')

    const byName = (await call('search_documents', { clientName: 'アルファ' })).json()
    expect(byName.total).toBe(2)
    expect(byName.documents[0]).toHaveProperty('totalAmount')
    expect((await call('search_documents', { startDate: '2026-04-01' })).json().total).toBe(2)
    expect((await call('search_documents', { endDate: '2026-03-31' })).json().total).toBe(1)
    expect((await call('search_documents', { documentType: 'quote' })).json().total).toBe(1)
  })

  it('get_document は書類と明細を返し、無いIDはエラー', async () => {
    const c = await newClient()
    const created = (
      await call('create_document', {
        documentType: 'invoice',
        clientId: c.id,
        issueDate: '2026-04-20',
        lines: [line, { ...line, content: '保守', unitPrice: 5000 }],
        generatePdf: false,
      })
    ).json()
    const got = (await call('get_document', { id: created.document.id })).json()
    expect(got.document.clientName).toBe('株式会社サンプル')
    expect(got.lines.map((l: { content: string }) => l.content)).toEqual(['Webサイト制作', '保守'])
    expect((await call('get_document', { id: 'nope' })).isError).toBe(true)
  })

  it('update_document は指定項目だけ変え、番号・他項目は保つ', async () => {
    const c = await newClient()
    const created = (
      await call('create_document', {
        documentType: 'invoice',
        clientId: c.id,
        issueDate: '2026-04-20',
        lines: [line],
        remarks: '元の備考',
        generatePdf: false,
      })
    ).json()
    const id = created.document.id

    const res = (await call('update_document', { id, issueDate: '2026-05-01' })).json()
    expect(res.document.documentNumber).toBe(created.document.documentNumber)
    expect(res.document.issueDate).toBe('2026-05-01')
    expect(res.document.remarks).toBe('元の備考')
    expect(res.document.totalAmount).toBe(110_000)
    expect(generatePdf).toHaveBeenCalledWith(id)

    const replaced = (
      await call('update_document', {
        id,
        generatePdf: false,
        lines: [{ content: '値引き後', quantity: 2, unitPrice: 5000, taxRate: 8, isReducedTaxRate: true }],
      })
    ).json()
    expect(replaced.document.subtotal).toBe(10_000)
    expect(replaced.document.taxAmount).toBe(800)
    expect(replaced.lines).toHaveLength(1)
  })

  it('update_document は無いID・重複番号をエラーにする', async () => {
    const c = await newClient()
    const mk = async (documentNumber: string) =>
      (
        await call('create_document', {
          documentType: 'invoice',
          clientId: c.id,
          issueDate: '2026-04-20',
          lines: [line],
          documentNumber,
          generatePdf: false,
        })
      ).json().document.id
    await mk('A-1')
    const second = await mk('A-2')
    expect((await call('update_document', { id: 'nope' })).isError).toBe(true)
    expect((await call('update_document', { id: second, documentNumber: 'A-1' })).isError).toBe(true)
  })
})

describe('mcp: generate_pdf', () => {
  it('保存済みの書類のPDFパスを返し、無いIDはエラー', async () => {
    const c = await newClient()
    const id = (
      await call('create_document', {
        documentType: 'invoice',
        clientId: c.id,
        issueDate: '2026-04-20',
        lines: [line],
        generatePdf: false,
      })
    ).json().document.id
    expect((await call('generate_pdf', { id })).json().filePath).toBe(`/tmp/${id}.pdf`)
    expect((await call('generate_pdf', { id: 'nope' })).isError).toBe(true)
  })
})
