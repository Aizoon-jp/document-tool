import { test, expect } from '@playwright/test'
import {
  launchElectron,
  closeElectron,
  type LaunchResult,
} from './helpers/electronApp'
import {
  seedHistoryData,
  getSeededDocumentIds,
  type SeededHistoryData,
} from './helpers/seed'

/**
 * P-003 書類履歴 (`/documents`) E2E テスト。
 *
 * 事前シード（`seedHistoryData`）で取引先 3 件 + 書類 15 件（d001..d015）を
 * 投入する。spec (docs/e2e-specs/document-history-e2e.md) の TC 全てがこの
 * シードデータを前提にしているため、後続 TC-002..TC-010 もこの同じデータで
 * 動作する想定。ここでは TC-001 のみ実装。
 */

let ctx: LaunchResult | undefined
let seeded: SeededHistoryData | undefined

test.beforeAll(async () => {
  ctx = await launchElectron()
  await ctx.page.setViewportSize({ width: 1440, height: 900 })
  await ctx.page.waitForLoadState('networkidle')
  seeded = await seedHistoryData(ctx.page)
})

test.afterAll(async () => {
  if (ctx) await closeElectron(ctx)
})

/**
 * E2E-DOC-HIST-001: 初期表示（一覧・件数・並び順）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-001) の
 * 期待結果すべてを検証する:
 *   - `<title>` = `書類履歴 — 事務ツール`
 *   - h1 「書類履歴」
 *   - 説明文 `発行済み書類の検索・再発行・複製を行います。`
 *   - 検索カード（見出し `検索`、`リセット` ボタン）
 *   - テーブル6列: 発行日 / 書類種別 / 取引先 / 書類番号 / 金額 / 操作メニュー
 *   - tbody 15行、先頭 d001（`2026/04/18` / `請求書` / `株式会社サンプル` /
 *     `2026-04-003`（font-mono）/ `￥1,320,000`）
 *   - issueDate 降順（末尾 2026-01-10）
 *   - 件数表示 `15件中 15件を表示` 左 / `並び順: 発行日（降順）` 右
 *   - 各行末 `操作メニュー` ボタン (aria-label=`操作メニュー`)
 */
test('E2E-DOC-HIST-001: 初期表示（一覧・件数・並び順）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
  })

  await test.step('<title> が「書類履歴 — 事務ツール」', async () => {
    await expect(page).toHaveTitle('書類履歴 — 事務ツール')
  })

  await test.step('h1「書類履歴」が可視', async () => {
    await expect(
      page.getByRole('heading', { level: 1, name: '書類履歴' })
    ).toBeVisible()
  })

  await test.step('説明文が表示される', async () => {
    await expect(
      page.getByText('発行済み書類の検索・再発行・複製を行います。', {
        exact: true,
      })
    ).toBeVisible()
  })

  await test.step('検索カード（見出し「検索」・「リセット」ボタン）が表示', async () => {
    await expect(page.getByText('検索', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'リセット' })
    ).toBeVisible()
  })

  await test.step('テーブルヘッダが6列: 発行日/書類種別/取引先/書類番号/金額/操作メニュー', async () => {
    const table = page.getByRole('table')
    await expect(table).toBeVisible()
    const headers = table.locator('thead th')
    await expect(headers).toHaveCount(6)
    await expect(headers.nth(0)).toHaveText('発行日')
    await expect(headers.nth(1)).toHaveText('書類種別')
    await expect(headers.nth(2)).toHaveText('取引先')
    await expect(headers.nth(3)).toHaveText('書類番号')
    await expect(headers.nth(4)).toHaveText('金額')
    // 6列目は空ヘッダ（操作メニュー列）。spec は「空列＝操作メニュー」と明記。
  })

  // 15行がロードされるまで待機（search IPC の非同期解決を考慮）
  const rows = page.locator('tbody > tr')
  await test.step('tbody の行数が 15 件', async () => {
    await expect(rows).toHaveCount(15, { timeout: 15000 })
  })

  await test.step('先頭行 (d001) のセルが spec 通り', async () => {
    const first = rows.first()
    const cells = first.locator('td')
    await expect(cells.nth(0)).toHaveText('2026/04/18')
    await expect(cells.nth(1)).toHaveText('請求書')
    await expect(cells.nth(2)).toHaveText('株式会社サンプル')
    // 書類番号は font-mono で表示される
    await expect(cells.nth(3)).toHaveText('2026-04-003')
    await expect(cells.nth(3)).toHaveClass(/font-mono/)
    // 金額は Intl.NumberFormat ja-JP JPY（￥ or ¥ を許容）
    await expect(cells.nth(4)).toHaveText(/[￥¥]\s?1,320,000/)
  })

  await test.step('15 行すべてが issueDate 降順（先頭 2026-04-18、末尾 2026-01-10）', async () => {
    // 各行の発行日セル（1 列目）を収集して降順チェック
    const dateCells = await rows.locator('td:nth-child(1)').allTextContents()
    expect(dateCells).toHaveLength(15)
    expect(dateCells[0]).toBe('2026/04/18')
    expect(dateCells[14]).toBe('2026/01/10')
    // 降順性: 連続する 2 行で前 >= 次
    for (let i = 0; i < dateCells.length - 1; i++) {
      const a = dateCells[i].replace(/\//g, '-')
      const b = dateCells[i + 1].replace(/\//g, '-')
      expect(a >= b).toBeTruthy()
    }
  })

  await test.step('件数表示「15件中 15件を表示」が左、「並び順: 発行日（降順）」が右', async () => {
    await expect(
      page.getByText('15件中 15件を表示', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText('並び順: 発行日（降順）', { exact: true })
    ).toBeVisible()
  })

  await test.step('各行末に aria-label=「操作メニュー」ボタンが存在', async () => {
    const menuButtons = page.getByRole('button', { name: '操作メニュー' })
    await expect(menuButtons).toHaveCount(15)
  })
})

/**
 * E2E-DOC-HIST-002: 取引先名フィルタ（部分一致）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-002):
 *   - 事前状態: `/documents` で初期表示済（15件）
 *   - 手順: `page.locator('#f-client')` に `サンプル` を入力
 *   - 期待結果:
 *       - tbody が 5 行（d001/d004/d007/d010/d013: 全て 株式会社サンプル）
 *       - 件数表示 `15件中 5件を表示` に更新
 *       - 表示された全行の `取引先` セルに `株式会社サンプル` を含む
 */
test('E2E-DOC-HIST-002: 取引先名フィルタ（部分一致）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  await test.step('#f-client に「サンプル」を入力', async () => {
    await page.locator('#f-client').fill('サンプル')
  })

  const rows = page.locator('tbody > tr')

  await test.step('tbody の行数が 5 件に絞り込まれる', async () => {
    await expect(rows).toHaveCount(5, { timeout: 10000 })
  })

  await test.step('件数表示が「15件中 5件を表示」に更新', async () => {
    await expect(
      page.getByText('15件中 5件を表示', { exact: true })
    ).toBeVisible()
  })

  await test.step('表示された全行の 取引先 セルに「株式会社サンプル」を含む', async () => {
    const clientCells = rows.locator('td:nth-child(3)')
    const count = await clientCells.count()
    expect(count).toBe(5)
    for (let i = 0; i < count; i++) {
      await expect(clientCells.nth(i)).toHaveText('株式会社サンプル')
    }
  })
})

/**
 * E2E-DOC-HIST-003: 期間フィルタ（開始／終了）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-003):
 *   - 事前状態: `/documents` で初期表示済
 *   - 手順:
 *       1. 期間 開始日 `<input type="date">` に `2026-03-01` 入力
 *       2. 期間 終了日 `<input type="date">` に `2026-03-31` 入力
 *   - 期待結果:
 *       - tbody が 5 行（d006〜d010: 2026年3月発行分）
 *       - 件数表示 `15件中 5件を表示`
 *       - 先頭行（降順）の発行日が `2026/03/31`、末尾が `2026/03/05`
 */
test('E2E-DOC-HIST-003: 期間フィルタ（開始／終了）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  const dateInputs = page.locator('input[type="date"]')

  await test.step('期間 開始日 <input type="date"> に 2026-03-01 を入力', async () => {
    await dateInputs.nth(0).fill('2026-03-01')
  })

  await test.step('期間 終了日 <input type="date"> に 2026-03-31 を入力', async () => {
    await dateInputs.nth(1).fill('2026-03-31')
  })

  const rows = page.locator('tbody > tr')

  await test.step('tbody の行数が 5 件に絞り込まれる（d006〜d010）', async () => {
    await expect(rows).toHaveCount(5, { timeout: 10000 })
  })

  await test.step('件数表示が「15件中 5件を表示」に更新', async () => {
    await expect(
      page.getByText('15件中 5件を表示', { exact: true })
    ).toBeVisible()
  })

  await test.step('先頭行の発行日が 2026/03/31、末尾が 2026/03/05', async () => {
    const dateCells = await rows.locator('td:nth-child(1)').allTextContents()
    expect(dateCells).toHaveLength(5)
    expect(dateCells[0]).toBe('2026/03/31')
    expect(dateCells[4]).toBe('2026/03/05')
  })
})

/**
 * E2E-DOC-HIST-004: 書類種別フィルタ（全5種パラメータ化）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-004):
 *   - 事前状態: `/documents` で初期表示済
 *   - 手順: `#f-type` を開いて各ラベルを順に選択
 *   - 期待結果（5種パラメータ化テーブル）:
 *       | 選択ラベル | documentType 値    | 期待表示件数 |
 *       | 請求書      | invoice            | 5件         |
 *       | 領収書      | receipt            | 3件         |
 *       | 見積書      | quote              | 3件         |
 *       | 振込依頼書  | payment_request    | 2件         |
 *       | 納品書      | delivery_note      | 2件         |
 *       | 全て        | all                | 15件        |
 *
 * shadcn/ui Select は Radix を使っているため、`#f-type` (SelectTrigger) を
 * クリックして開き、`role=option` でアイテムをクリックする。
 */
const HIST_004_CASES: Array<{ label: string; expected: number }> = [
  { label: '請求書', expected: 5 },
  { label: '領収書', expected: 3 },
  { label: '見積書', expected: 3 },
  { label: '振込依頼書', expected: 2 },
  { label: '納品書', expected: 2 },
]

test('E2E-DOC-HIST-004: 書類種別フィルタ（全5種パラメータ化）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  const rows = page.locator('tbody > tr')
  const trigger = page.locator('#f-type')

  for (const { label, expected } of HIST_004_CASES) {
    await test.step(`書類種別「${label}」を選択 → ${expected} 件`, async () => {
      await trigger.click()
      await page.getByRole('option', { name: label, exact: true }).click()
      await expect(rows).toHaveCount(expected, { timeout: 10000 })
      await expect(
        page.getByText(`15件中 ${expected}件を表示`, { exact: true })
      ).toBeVisible()
    })
  }

  await test.step('書類種別「全て」に戻すと 15 件に復帰', async () => {
    await trigger.click()
    await page.getByRole('option', { name: '全て', exact: true }).click()
    await expect(rows).toHaveCount(15, { timeout: 10000 })
    await expect(
      page.getByText('15件中 15件を表示', { exact: true })
    ).toBeVisible()
  })
})

/**
 * E2E-DOC-HIST-005: 金額範囲フィルタ（下限 500,000 / 上限 1,500,000）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-005):
 *   - 事前状態: `/documents` で初期表示済
 *   - 手順:
 *       1. 金額下限 `getByPlaceholder('下限')` に `500000` を入力
 *       2. 金額上限 `getByPlaceholder('上限')` に `1500000` を入力
 *   - 期待結果:
 *       - 合計金額 (totalAmount) が 500,000 ≤ x ≤ 1,500,000 の行のみ表示
 *       - 件数表示 `15件中 N件を表示`
 *
 * seed (tests/e2e/helpers/seed.ts::seedHistoryData) の totalAmount は
 * unitPrice × 1.1 (includeTax=true, taxRate=10, quantity=1) で算出される。
 * 15件のうち [500000, 1500000] に入るのは以下 6 件 (N=6):
 *   - d001: 1,200,000 × 1.1 = 1,320,000  ✓
 *   - d005:   500,000 × 1.1 =   550,000  ✓
 *   - d006:   700,000 × 1.1 =   770,000  ✓
 *   - d012: 1,000,000 × 1.1 = 1,100,000  ✓
 *   - d013:   600,000 × 1.1 =   660,000  ✓
 *   - d015:   500,000 × 1.1 =   550,000  ✓
 */
test('E2E-DOC-HIST-005: 金額範囲フィルタ', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  await test.step('金額下限「下限」に 500000 を入力', async () => {
    await page.getByPlaceholder('下限').fill('500000')
  })

  await test.step('金額上限「上限」に 1500000 を入力', async () => {
    await page.getByPlaceholder('上限').fill('1500000')
  })

  const rows = page.locator('tbody > tr')
  // totalAmount が [500000, 1500000] の 6 件（d001/d005/d006/d012/d013/d015）
  const N = 6

  await test.step(`tbody の行数が ${N} 件に絞り込まれる`, async () => {
    await expect(rows).toHaveCount(N, { timeout: 10000 })
  })

  await test.step(`件数表示が「15件中 ${N}件を表示」に更新`, async () => {
    await expect(
      page.getByText(`15件中 ${N}件を表示`, { exact: true })
    ).toBeVisible()
  })

  await test.step('表示された全行の金額が 500,000 〜 1,500,000 の範囲内', async () => {
    const amountCells = await rows.locator('td:nth-child(5)').allTextContents()
    expect(amountCells).toHaveLength(N)
    for (const text of amountCells) {
      // `￥1,320,000` / `¥550,000` のような表記から数値を抽出
      const digits = text.replace(/[^\d]/g, '')
      const n = Number(digits)
      expect(n).toBeGreaterThanOrEqual(500_000)
      expect(n).toBeLessThanOrEqual(1_500_000)
    }
  })
})

/**
 * E2E-DOC-HIST-006: 複合条件＋リセット
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-006):
 *   - 事前状態: `/documents` で初期表示済（15件）
 *   - 手順:
 *       1. `#f-client` に `アイゾーン` を入力
 *       2. `#f-type` を開いて `請求書` を選択
 *       3. `getByRole('button', { name: 'リセット' })` をクリック
 *   - 期待結果:
 *       - 手順1〜2後: tbody が 3 行（d006 / d009 / d012: 合同会社アイゾーン × invoice）、
 *         件数表示 `15件中 3件を表示`
 *       - リセット後: tbody が 15 行に復帰、件数表示 `15件中 15件を表示`
 *       - `#f-client` が空、期間の両 input が空、`#f-type` の表示値が `全て`、
 *         金額範囲の両 Input が空
 *
 * seed (tests/e2e/helpers/seed.ts::seedHistoryData) における
 * 「合同会社アイゾーン (c3)」× `invoice` の組合せは d006 / d009 / d012 の 3 件。
 */
test('E2E-DOC-HIST-006: 複合条件＋リセット', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  const rows = page.locator('tbody > tr')

  await test.step('#f-client に「アイゾーン」を入力', async () => {
    await page.locator('#f-client').fill('アイゾーン')
  })

  await test.step('#f-type を開いて「請求書」を選択', async () => {
    await page.locator('#f-type').click()
    await page.getByRole('option', { name: '請求書', exact: true }).click()
  })

  await test.step('複合条件適用後: tbody が 3 行（アイゾーン × 請求書）', async () => {
    await expect(rows).toHaveCount(3, { timeout: 10000 })
  })

  await test.step('件数表示が「15件中 3件を表示」に更新', async () => {
    await expect(
      page.getByText('15件中 3件を表示', { exact: true })
    ).toBeVisible()
  })

  await test.step('3 行すべて 取引先=合同会社アイゾーン / 種別=請求書', async () => {
    const count = await rows.count()
    expect(count).toBe(3)
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('td:nth-child(2)')).toHaveText('請求書')
      await expect(rows.nth(i).locator('td:nth-child(3)')).toHaveText(
        '合同会社アイゾーン'
      )
    }
  })

  await test.step('「リセット」ボタンをクリック', async () => {
    await page.getByRole('button', { name: 'リセット' }).click()
  })

  await test.step('リセット後: tbody が 15 行に復帰', async () => {
    await expect(rows).toHaveCount(15, { timeout: 10000 })
  })

  await test.step('リセット後: 件数表示が「15件中 15件を表示」', async () => {
    await expect(
      page.getByText('15件中 15件を表示', { exact: true })
    ).toBeVisible()
  })

  await test.step('リセット後: #f-client が空', async () => {
    await expect(page.locator('#f-client')).toHaveValue('')
  })

  await test.step('リセット後: 期間の両 input（type=date）が空', async () => {
    const dateInputs = page.locator('input[type="date"]')
    await expect(dateInputs.nth(0)).toHaveValue('')
    await expect(dateInputs.nth(1)).toHaveValue('')
  })

  await test.step('リセット後: #f-type の表示値が「全て」', async () => {
    await expect(page.locator('#f-type')).toHaveText('全て')
  })

  await test.step('リセット後: 金額範囲の下限/上限 Input が空', async () => {
    await expect(page.getByPlaceholder('下限')).toHaveValue('')
    await expect(page.getByPlaceholder('上限')).toHaveValue('')
  })
})

/**
 * E2E-DOC-HIST-007: 行クリックで詳細遷移
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-007):
 *   - 事前状態: `/documents` で初期表示済
 *   - 手順: `tbody > tr` の先頭行（d001: 2026/04/18 株式会社サンプル）をクリック
 *   - 期待結果: URL が `/documents/{d001 の id}` に遷移する
 *
 * 仕様書では `/documents/d001` と記載されているが、実装は IPC で生成された
 * UUID を id として返すため、`getSeededDocumentIds(seeded).d001` で
 * シード投入時の実 ID を取得して検証する。
 *
 * 行内の操作メニューセル（<td>）は onClick で `stopPropagation()` を呼ぶので、
 * 操作メニューではなく行の他セル（発行日セル）をクリックして遷移させる。
 */
test('E2E-DOC-HIST-007: 行クリックで詳細遷移', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  const rows = page.locator('tbody > tr')

  await test.step('先頭行の表示が spec 通り（2026/04/18 / 株式会社サンプル）', async () => {
    const first = rows.first()
    await expect(first.locator('td').nth(0)).toHaveText('2026/04/18')
    await expect(first.locator('td').nth(2)).toHaveText('株式会社サンプル')
  })

  await test.step('先頭行（操作メニューセル以外）をクリック', async () => {
    // 発行日セル (1 列目) をクリック。操作メニューセル (6 列目) は
    // stopPropagation で遷移が発火しないため避ける。
    await rows.first().locator('td').nth(0).click()
  })

  await test.step(`URL が /documents/${d001Id} に遷移する`, async () => {
    // 末尾スラッシュを許容しつつ d001 の UUID で終わることを検証。
    const expected = new RegExp(`/documents/${d001Id}/?$`)
    await expect(page).toHaveURL(expected, { timeout: 10000 })
  })
})

/**
 * E2E-DOC-HIST-008: 操作メニュー：複製で新規作成へ遷移
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-008):
 *   - 事前状態: `/documents` で初期表示済
 *   - 手順:
 *       1. 先頭行（d001）の `操作メニュー` ボタン（`aria-label=操作メニュー`）をクリック
 *       2. DropdownMenu 内の `複製` 項目をクリック
 *   - 期待結果:
 *       - URL が `/documents/new?from={d001 の UUID}` に遷移する
 *       - `/documents/{d001}`（詳細ページ）には遷移しない（親 `<tr>` の onClick
 *         が発火しない＝stopPropagation が効いていること）
 *
 * 仕様書では `/documents/new?from=d001` と記載されているが、実装は IPC 経由で
 * 生成された UUID を id として返すため、`getSeededDocumentIds(seeded).d001` で
 * シード投入時の実 ID を取得して検証する。
 */
test('E2E-DOC-HIST-008: 操作メニュー：複製で新規作成へ遷移', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  const rows = page.locator('tbody > tr')

  await test.step('先頭行の表示が spec 通り（2026/04/18 / 株式会社サンプル）', async () => {
    const first = rows.first()
    await expect(first.locator('td').nth(0)).toHaveText('2026/04/18')
    await expect(first.locator('td').nth(2)).toHaveText('株式会社サンプル')
  })

  await test.step('先頭行の「操作メニュー」ボタンをクリックして DropdownMenu を開く', async () => {
    const menuButtons = page.getByRole('button', { name: '操作メニュー' })
    await expect(menuButtons).toHaveCount(15)
    await menuButtons.first().click()
  })

  await test.step('DropdownMenu の「複製」項目をクリック', async () => {
    await page.getByRole('menuitem', { name: '複製' }).click()
  })

  await test.step(`URL が /documents/new?from=${d001Id} に遷移する`, async () => {
    // クエリパラメータ `?from={d001 の UUID}` が付いた new ページであることを検証。
    // 末尾スラッシュ/追加クエリを許容しつつ `from=` に d001 の UUID が入ること
    // を確認する。
    const expected = new RegExp(`/documents/new/?\\?from=${d001Id}(&|$)`)
    await expect(page).toHaveURL(expected, { timeout: 10000 })
  })

  await test.step('詳細ページ /documents/{d001} には遷移していない（stopPropagation 確認）', async () => {
    // 親 <tr> の onClick が発火していたら、最後に /documents/{d001Id} へ
    // 遷移して new?from=... より後に詳細 URL になっているはず。
    // ここでは現在 URL が /documents/{d001Id} の形式でないことを確認する。
    const detailRe = new RegExp(`/documents/${d001Id}/?$`)
    await expect(page).not.toHaveURL(detailRe)
  })
})

/**
 * E2E-DOC-HIST-009: 操作メニュー：削除（OK／キャンセル分岐）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-009):
 *   - 目的: 削除メニュー選択時の `window.confirm` 分岐の挙動を検証
 *   - (a) OK: 行が削除される、URL は `/documents` のまま
 *   - (b) キャンセル: 何も起きない、URL・件数ともに変化なし
 *
 * 仕様書は Phase 4（DB 未接続）時点で書かれており、期待結果は
 * 「コンソールに `[history] delete {id}` が出力」「一覧からは消えない」と
 * なっている。しかし Phase 8 の IPC 統合（renderer/pages/documents/index.tsx
 * `handleDelete` + `useDeleteDocument`）で実装が変わり、OK 選択時は実 IPC
 * `documents:delete` を呼び出して DB から削除 → 一覧再取得で行が消える動作に
 * なっている。従って本テストは「UI 動作（行数変化・URL 不変）」を検証する。
 *
 * 同一 Electron インスタンス（=同一 DB）で両分岐を検証するため、
 * 先に (b) キャンセル（件数 15 維持）→ 次に (a) OK（15→14）の順で実行する。
 */
test('E2E-DOC-HIST-009: 操作メニュー：削除（OK／キャンセル分岐）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  const rows = page.locator('tbody > tr')

  // ---------- (b) キャンセル：行は消えない、URL は /documents のまま ----------
  await test.step('(b) confirm でキャンセル → 件数 15 維持', async () => {
    // dialog は 1 回分だけ登録（仕様書補足: page.once が安定）
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toBe(
        'この書類を削除しますか？この操作は取り消せません。'
      )
      await dialog.dismiss()
    })

    // 先頭行の操作メニュー → 削除
    const menuButtons = page.getByRole('button', { name: '操作メニュー' })
    await expect(menuButtons).toHaveCount(15)
    await menuButtons.first().click()
    await page.getByRole('menuitem', { name: '削除' }).click()

    // 件数は 15 のまま
    await expect(rows).toHaveCount(15, { timeout: 10000 })
    // URL は /documents のまま
    await expect(page).toHaveURL(/\/documents\/?$/)
  })

  // ---------- (a) OK：行が消える（15 → 14）、URL は /documents のまま ----------
  await test.step('(a) confirm で OK → 件数 15→14、URL は /documents', async () => {
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toBe(
        'この書類を削除しますか？この操作は取り消せません。'
      )
      await dialog.accept()
    })

    const menuButtons = page.getByRole('button', { name: '操作メニュー' })
    await menuButtons.first().click()
    await page.getByRole('menuitem', { name: '削除' }).click()

    // 一覧再取得で行数が 14 に減る
    await expect(rows).toHaveCount(14, { timeout: 15000 })
    // URL は /documents のまま
    await expect(page).toHaveURL(/\/documents\/?$/)
  })
})

/**
 * E2E-DOC-HIST-010: 空状態（該当0件）
 *
 * spec (docs/e2e-specs/document-history-e2e.md §TC E2E-DOC-HIST-010):
 *   - 目的: 絞り込み結果が 0 件のときにテーブルが破綻せず、案内カードが表示されること
 *   - 事前状態: `/documents` で初期表示済（15件）
 *   - 手順: `#f-client` に `該当しない文字列` を入力
 *   - 期待結果:
 *       - テーブル（role=table）が DOM から消える
 *       - 破線枠カードが表示され、以下テキストを含む:
 *           - `該当する書類がありません` (text-sm font-medium)
 *           - `検索条件を変更するか、リセットしてください。` (text-xs text-muted-foreground)
 *       - 件数表示が `15件中 0件を表示`
 *       - `リセット` ボタンは通常どおり動作し、15 件表示に復帰する
 */
test.only('E2E-DOC-HIST-010: 空状態（該当0件）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('/documents に遷移して 15 件が表示されるまで待つ', async () => {
    await page.goto('app://./documents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  })

  await test.step('#f-client に「該当しない文字列」を入力', async () => {
    await page.locator('#f-client').fill('該当しない文字列')
  })

  await test.step('テーブル（role=table）が DOM から消える', async () => {
    await expect(page.getByRole('table')).toHaveCount(0, { timeout: 10000 })
  })

  await test.step('破線枠カードに「該当する書類がありません」が表示', async () => {
    await expect(
      page.getByText('該当する書類がありません', { exact: true })
    ).toBeVisible()
  })

  await test.step('副文「検索条件を変更するか、リセットしてください。」が表示', async () => {
    await expect(
      page.getByText('検索条件を変更するか、リセットしてください。', {
        exact: true,
      })
    ).toBeVisible()
  })

  await test.step('件数表示が「15件中 0件を表示」', async () => {
    await expect(
      page.getByText('15件中 0件を表示', { exact: true })
    ).toBeVisible()
  })

  await test.step('「リセット」ボタンで 15 件表示に復帰', async () => {
    await page.getByRole('button', { name: 'リセット' }).click()
    await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 10000 })
    await expect(
      page.getByText('15件中 15件を表示', { exact: true })
    ).toBeVisible()
    await expect(page.locator('#f-client')).toHaveValue('')
  })
})
