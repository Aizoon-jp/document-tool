import type { Page } from '@playwright/test'
import type {
  Client,
  ClientInput,
  Document,
  DocumentDraft,
  DocumentType,
  Item,
  ItemInput,
  Stamp,
} from '../../../renderer/types'

/**
 * 1x1 transparent PNG (smallest valid PNG) encoded as a data URL.
 * The real stamp IPC (`stamps:create`) requires a PNG/JPG data URL and writes
 * the decoded bytes to the userData/stamps/ directory. Any valid PNG works for
 * the purposes of E2E-DOC-NEW-001 (we only assert on the stamp's name/label).
 */
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII='

/**
 * Seed a single client ("株式会社サンプル") via the real IPC bridge.
 * Used by E2E-DOC-NEW-003 which verifies that selecting this client causes
 * the preview to show:
 *   - 宛名: "株式会社サンプル 御中"
 *   - 住所: "〒150-0001 東京都渋谷区神宮前1-2-3"
 *
 * Honorific/postalCode/address are fixed to the values expected by the spec
 * (`docs/e2e-specs/document-create-e2e.md` TC E2E-DOC-NEW-003).
 */
export async function seedSampleClient(page: Page): Promise<Client> {
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )

  return page.evaluate(async () => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    const clientInput: ClientInput = {
      name: '株式会社サンプル',
      honorific: '御中',
      postalCode: '150-0001',
      address: '東京都渋谷区神宮前1-2-3',
      tel: null,
      contactPerson: null,
      contactDepartment: null,
      paymentTerms: null,
      defaultTaxCategory: 'taxable_10',
      notes: null,
    }

    return ipc.invoke<Client>('clients:create', clientInput)
  })
}

/**
 * Seed a single item ("Webサイト制作") via the real IPC bridge.
 * Used by E2E-DOC-NEW-006 which verifies that selecting this item from the
 * 品目セレクト auto-fills 品目名/単価/単位/数量 on the 1st line:
 *   - 品目名: "Webサイト制作"
 *   - 単価: 500000
 *   - 単位: "式"
 *   - 数量: 1（defaultQuantity）
 *   - 税率: 標準10%（isReducedTaxRate=false）
 *
 * Matches MOCK_ITEMS.i1 in the E2E spec
 * (`docs/e2e-specs/document-create-e2e.md` TC E2E-DOC-NEW-006).
 */
export async function seedSampleItem(page: Page): Promise<Item> {
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )

  return page.evaluate(async () => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    const itemInput: ItemInput = {
      name: 'Webサイト制作',
      unitPrice: 500000,
      unit: '式',
      taxRate: 10,
      isReducedTaxRate: false,
      defaultQuantity: 1,
      notes: null,
    }

    return ipc.invoke<Item>('items:create', itemInput)
  })
}

/**
 * Seed a default stamp ("角印（代表）", isDefault=true) via the real IPC bridge.
 * Used by the document-create page to populate the 印影 section.
 */
export async function seedDefaultStamp(page: Page): Promise<Stamp> {
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )

  return page.evaluate(async (imageDataUrl) => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    return ipc.invoke<Stamp>('stamps:create', {
      name: '角印（代表）',
      imageDataUrl,
      defaultXMm: 150,
      defaultYMm: 35,
      widthMm: 25,
      opacity: 0.8,
      isDefault: true,
    })
  }, TINY_PNG_DATA_URL)
}

/**
 * Seed a second stamp ("角印（営業）", isDefault=false) via the real IPC bridge.
 * Used by E2E-DOC-NEW-008 which verifies that the 印影 section supports
 * multi-select toggling. The default stamp stays active by default, and
 * clicking this stamp toggles it on/off without deactivating the default one.
 *
 * The IPC handler (`createStamp` in main/ipc/stamps.ts) demotes any existing
 * `isDefault=true` stamp to `false` inside a transaction when a new default
 * is inserted. Passing `isDefault=false` here preserves 角印（代表） as the
 * default, which is required by NEW-008 pre-state.
 */
export async function seedSecondStamp(page: Page): Promise<Stamp> {
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )

  return page.evaluate(async (imageDataUrl) => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    return ipc.invoke<Stamp>('stamps:create', {
      name: '角印（営業）',
      imageDataUrl,
      defaultXMm: 150,
      defaultYMm: 35,
      widthMm: 25,
      opacity: 0.8,
      isDefault: false,
    })
  }, TINY_PNG_DATA_URL)
}

/**
 * P-003 書類履歴 E2E 用の 15 件シード。
 *
 * spec (docs/e2e-specs/document-history-e2e.md) の各テストケースが要求する
 * 値を 1 つも残さず満たすよう、取引先 3 件（c1:株式会社サンプル / c2:有限会社
 * テスト商事 / c3:合同会社アイゾーン）と書類 15 件（d001..d015）を投入する。
 *
 * 各行の総額 (`totalAmount`) は IPC 側で `calculateTotals` が再計算するため、
 * ここでは `unitPrice × quantity` が spec の表示金額を満たすよう逆算して
 * 渡している (`includeTax=true`, `taxRate=10`, `quantity=1`):
 *   - 合計 = subtotal + tax = unitPrice × 1.1
 *
 * d001 以外の行にも spec の TC-002 〜 TC-006 全てが要求する条件（取引先・
 * 書類種別・発行日・金額レンジ）を矛盾なく埋め込む:
 *   - サンプル: d001, d004, d007, d010, d013 (TC-002: 5件)
 *   - アイゾーン: d006, d009, d012 (TC-006: サンプル×請求書 ≠ アイゾーン×請求書=3件)
 *   - テスト商事: d002, d003, d005, d008, d011, d014, d015 (残 7 件)
 *   - invoice 5: d001/d006/d009/d012/d015 (TC-004)
 *   - receipt 3: d003/d008/d014 (TC-004)
 *   - quote 3: d002/d007/d013 (TC-004)
 *   - payment_request 2: d005/d011 (TC-004)
 *   - delivery_note 2: d004/d010 (TC-004)
 *   - 発行日降順: d001=2026-04-18 … d006=2026-03-31 … d010=2026-03-05 …
 *     d015=2026-01-10 (TC-001/003)
 *   - 金額: d001=¥1,320,000 / d005=¥550,000 / d006=¥770,000 / d013=¥660,000 /
 *     d015=¥550,000 / d007=¥2,200,000 / d012=¥1,100,000 / d003=¥88,000 /
 *     d010=¥99,000 / d008=¥33,000 / d014=¥44,000 (TC-005)
 *   - 他 (d002/d004/d009/d011) は (100,000, 500,000) の中間帯に揃える
 */
export interface SeededHistoryData {
  clientSample: Client // 株式会社サンプル (c1)
  clientTest: Client // 有限会社テスト商事 (c2)
  clientAizoon: Client // 合同会社アイゾーン (c3)
  documents: Document[] // 降順 (d001..d015)
}

export async function seedHistoryData(
  page: Page
): Promise<SeededHistoryData> {
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )

  return page.evaluate(async () => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    const mkClient = (name: string, honorific: '御中' | '様'): ClientInput => ({
      name,
      honorific,
      postalCode: null,
      address: null,
      tel: null,
      contactPerson: null,
      contactDepartment: null,
      paymentTerms: null,
      defaultTaxCategory: 'taxable_10',
      notes: null,
    })

    const clientSample = await ipc.invoke<Client>(
      'clients:create',
      mkClient('株式会社サンプル', '御中')
    )
    const clientTest = await ipc.invoke<Client>(
      'clients:create',
      mkClient('有限会社テスト商事', '御中')
    )
    const clientAizoon = await ipc.invoke<Client>(
      'clients:create',
      mkClient('合同会社アイゾーン', '御中')
    )

    type Row = {
      id: string // d001..d015 (検証用インデックス)
      type: DocumentType
      number: string // documentNumber 文字列（spec 表示値）
      issueDate: string // yyyy-MM-dd
      clientId: string
      // subtotal (税抜単価) — includeTax=true, taxRate=10 で total = unitPrice*1.1
      unitPrice: number
    }

    const c1 = clientSample.id
    const c2 = clientTest.id
    const c3 = clientAizoon.id

    // 15 件を発行日降順で定義。spec の各 TC が要求する条件を満たす値を直接記述。
    const rows: Row[] = [
      // 4月
      { id: 'd001', type: 'invoice',         number: '2026-04-003', issueDate: '2026-04-18', clientId: c1, unitPrice: 1_200_000 },
      { id: 'd002', type: 'quote',           number: '2026-04-002', issueDate: '2026-04-15', clientId: c2, unitPrice: 300_000 },
      { id: 'd003', type: 'receipt',         number: '2026-04-001', issueDate: '2026-04-10', clientId: c2, unitPrice: 80_000 },
      { id: 'd004', type: 'delivery_note',   number: '2026-04-dn1', issueDate: '2026-04-05', clientId: c1, unitPrice: 300_000 },
      { id: 'd005', type: 'payment_request', number: '2026-04-pr1', issueDate: '2026-04-01', clientId: c2, unitPrice: 500_000 },
      // 3月
      { id: 'd006', type: 'invoice',         number: '2026-03-003', issueDate: '2026-03-31', clientId: c3, unitPrice: 700_000 },
      { id: 'd007', type: 'quote',           number: '2026-03-002', issueDate: '2026-03-20', clientId: c1, unitPrice: 2_000_000 },
      { id: 'd008', type: 'receipt',         number: '2026-03-001', issueDate: '2026-03-15', clientId: c2, unitPrice: 30_000 },
      { id: 'd009', type: 'invoice',         number: '2026-03-002b', issueDate: '2026-03-10', clientId: c3, unitPrice: 300_000 },
      { id: 'd010', type: 'delivery_note',   number: '2026-03-dn1', issueDate: '2026-03-05', clientId: c1, unitPrice: 90_000 },
      // 2月
      { id: 'd011', type: 'payment_request', number: '2026-02-pr1', issueDate: '2026-02-25', clientId: c2, unitPrice: 300_000 },
      { id: 'd012', type: 'invoice',         number: '2026-02-003', issueDate: '2026-02-15', clientId: c3, unitPrice: 1_000_000 },
      { id: 'd013', type: 'quote',           number: '2026-02-002', issueDate: '2026-02-05', clientId: c1, unitPrice: 600_000 },
      // 1月
      { id: 'd014', type: 'receipt',         number: '2026-01-001', issueDate: '2026-01-20', clientId: c2, unitPrice: 40_000 },
      { id: 'd015', type: 'invoice',         number: '2026-01-003', issueDate: '2026-01-10', clientId: c2, unitPrice: 500_000 },
    ]

    const documents: Document[] = []
    for (const row of rows) {
      const draft: DocumentDraft = {
        documentType: row.type,
        documentNumber: row.number,
        issueDate: row.issueDate,
        clientId: row.clientId,
        detailMode: 'direct',
        lines: [
          {
            itemId: null,
            content: `${row.id} 項目`,
            quantity: 1,
            unit: '式',
            unitPrice: row.unitPrice,
            taxRate: 10,
            isReducedTaxRate: false,
          },
        ],
        externalAmount: 0,
        options: {
          includeTax: true,
          reducedTaxRate: true,
          withholdingTax: false,
          showRemarks: false,
          showBankInfo: true,
        },
        stampIds: [],
        remarks: '',
      }
      const doc = await ipc.invoke<Document>('documents:create', draft)
      documents.push(doc)
    }

    return { clientSample, clientTest, clientAizoon, documents }
  })
}

/**
 * Return the document id of the first row (d001) from a seeded history result.
 * 後続の E2E-DOC-HIST-007/008/009 が行クリック・操作メニューで使う ID を
 * 決定論的に取り出すためのユーティリティ。
 */
export function getSeededDocumentIds(
  seeded: SeededHistoryData
): Record<string, string> {
  const labels = [
    'd001','d002','d003','d004','d005','d006','d007','d008',
    'd009','d010','d011','d012','d013','d014','d015',
  ]
  const map: Record<string, string> = {}
  seeded.documents.forEach((doc, idx) => {
    map[labels[idx]] = doc.id
  })
  return map
}

/**
 * Seed a minimal client + 12 documents via the real IPC bridge that the
 * preload script exposes on `window.ipc`. This goes through the production
 * IPC handlers (real Drizzle + SQLite), so no mocking is involved.
 *
 * Composition (spec dashboard-e2e.md TC E2E-DASH-005):
 *   - invoice: 5件
 *   - receipt: 3件
 *   - quote:   2件
 *   - payment_request: 1件
 *   - delivery_note:   1件
 * Total: 12 件（すべて当月内の issueDate）
 *
 * 最近5件（DASH-003/004 用）は issueDate の新しい順（当月の day=12..8）に
 * invoice / receipt / quote / invoice / receipt を並べる。行数=5 と
 * 各種別ラベルが DOCUMENT_TYPE_LABEL にマップされた日本語であることを保証する。
 */
/**
 * P-005 設定 E2E 用のシード。
 *
 * spec (docs/e2e-specs/settings-e2e.md) の TC-001/002 が前提とする:
 *   - 取引先マスタ 3件（株式会社サンプル / 有限会社テスト商事 / 合同会社アイゾーン）
 *   - 品目マスタ 5件（i1:Web制作 / i2..i4:通常税率10% / i5:会議用弁当 軽減税率8%）
 *   - 印影 2件（seedDefaultStamp + seedSecondStamp, 計 isDefault=1 / 非default=1）
 *   - 書類別設定 5件（main/ipc/documentSettings.ts の seedDefaultDocumentSettings で自動投入）
 *
 * `seedSampleClient` / `seedSampleItem` / `seedDefaultStamp` / `seedSecondStamp`
 * を再利用し、追加の 2 件（取引先）と 4 件（品目）をここで投入する。
 */
export async function seedSettingsData(page: Page): Promise<void> {
  // 取引先: seedSampleClient で 1 件（株式会社サンプル）→ 合計 3 件になるよう 2 件追加
  await seedSampleClient(page)
  // 品目: seedSampleItem で 1 件（Webサイト制作）→ 合計 5 件になるよう 4 件追加
  await seedSampleItem(page)
  // 印影: seedDefaultStamp + seedSecondStamp で 2 件
  await seedDefaultStamp(page)
  await seedSecondStamp(page)

  await page.evaluate(async () => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    // 追加取引先 2 件
    const extraClients: ClientInput[] = [
      {
        name: '有限会社テスト商事',
        honorific: '御中',
        postalCode: null,
        address: null,
        tel: null,
        contactPerson: null,
        contactDepartment: null,
        paymentTerms: null,
        defaultTaxCategory: 'taxable_10',
        notes: null,
      },
      {
        name: '合同会社アイゾーン',
        honorific: '御中',
        postalCode: null,
        address: null,
        tel: null,
        contactPerson: null,
        contactDepartment: null,
        paymentTerms: null,
        defaultTaxCategory: 'taxable_10',
        notes: null,
      },
    ]
    for (const c of extraClients) {
      await ipc.invoke('clients:create', c)
    }

    // 追加品目 4 件（うち i5=会議用弁当 が軽減税率8%）
    const extraItems: ItemInput[] = [
      {
        name: 'コンサルティング費用',
        unitPrice: 80000,
        unit: '時間',
        taxRate: 10,
        isReducedTaxRate: false,
        defaultQuantity: 1,
        notes: null,
      },
      {
        name: '保守運用（月額）',
        unitPrice: 30000,
        unit: '月',
        taxRate: 10,
        isReducedTaxRate: false,
        defaultQuantity: 1,
        notes: null,
      },
      {
        name: '交通費実費',
        unitPrice: 0,
        unit: '式',
        taxRate: 10,
        isReducedTaxRate: false,
        defaultQuantity: 1,
        notes: null,
      },
      {
        name: '会議用弁当',
        unitPrice: 1200,
        unit: '個',
        taxRate: 8,
        isReducedTaxRate: true,
        defaultQuantity: 1,
        notes: null,
      },
    ]
    for (const i of extraItems) {
      await ipc.invoke('items:create', i)
    }
  })
}

export async function seedDashboardTestData(
  page: Page
): Promise<{ client: Client; documents: Document[] }> {
  // Wait for the preload bridge to be available.
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )

  return page.evaluate(async () => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc

    const clientInput: ClientInput = {
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
    }

    const client = await ipc.invoke<Client>('clients:create', clientInput)

    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1 // 1-based
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const toIso = (day: number): string =>
      `${yearMonth}-${String(day).padStart(2, '0')}`

    // 12件の書類種別を issueDate 降順（新しい順）で並べる。
    // 最新5件（index 0..4）は DASH-003/004 が参照する直近テーブルの行。
    // 種別は spec と整合させつつ行ごとに違う（種別ラベル検証のため多様性を確保）。
    //
    // issueDate の day は当月の 12→1 を割り当て（当月境界内に収める）。
    // 合計内訳: invoice=5, receipt=3, quote=2, payment_request=1, delivery_note=1
    const plan: DocumentType[] = [
      'invoice',         // day 12
      'receipt',         // day 11
      'quote',           // day 10
      'invoice',         // day  9
      'receipt',         // day  8
      'invoice',         // day  7
      'quote',           // day  6
      'receipt',         // day  5
      'invoice',         // day  4
      'payment_request', // day  3
      'delivery_note',   // day  2
      'invoice',         // day  1
    ]

    const documents: Document[] = []
    for (let i = 0; i < plan.length; i++) {
      const day = plan.length - i // 12, 11, ... 1
      const sequence = String(i + 1).padStart(3, '0')
      const draft: DocumentDraft = {
        documentType: plan[i],
        documentNumber: `${yearMonth}-${sequence}`,
        issueDate: toIso(day),
        clientId: client.id,
        detailMode: 'direct',
        lines: [
          {
            itemId: null,
            content: `テスト項目${i + 1}`,
            quantity: 1,
            unit: '式',
            unitPrice: 1_200_000,
            taxRate: 10,
            isReducedTaxRate: false,
          },
        ],
        externalAmount: 0,
        options: {
          includeTax: true,
          reducedTaxRate: true,
          withholdingTax: false,
          showRemarks: true,
          showBankInfo: true,
        },
        stampIds: [],
        remarks: '',
      }

      const doc = await ipc.invoke<Document>('documents:create', draft)
      documents.push(doc)
    }

    return { client, documents }
  })
}
