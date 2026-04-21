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
 * P-004 書類詳細 (`/documents/[id]`) E2E テスト。
 *
 * 事前シード（`seedHistoryData`）で取引先 3 件 + 書類 15 件（d001..d015）を
 * 投入する。spec (docs/e2e-specs/document-detail-e2e.md) の TC は全てこの
 * シードデータを前提にしているため、d001 の UUID を `getSeededDocumentIds`
 * で取り出して `/documents/{UUID}` に直接遷移させる。
 *
 * Phase 8 以降 `getStaticPaths` の固定ID列挙は存在せず、動的ルーティング＋
 * CSR で IPC からデータ取得する実装のため、Playwright から直接 UUID 付き
 * URL にアクセス可能。
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
 * E2E-DOC-DETAIL-001: 初期表示（情報カード＋プレビュー）
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-001) の
 * 期待結果すべてを検証する:
 *   - `<title>` = `2026-04-003 — 請求書 — 事務ツール`
 *   - h1 に `請求書` と `2026-04-003` が含まれる
 *   - サブヘッダに `発行日 2026/04/18 ／ 株式会社サンプル`
 *   - ヘッダ右に4ボタン: `履歴に戻る` / `この書類を複製` / `編集（再発行）` / `PDF再生成`
 *     ※ 実装は「編集（再発行）」ではなく「新規作成へ」のラベル（Pencilアイコン付き）
 *     だが、spec の期待ラベルどおり `編集（再発行）` で検証する（Pass時は実装と整合、
 *     Fail時はログでラベル差分を確認できる）
 *   - 左カラム `書類情報` カード内に 10 ラベル
 *   - 左カラム下段 `危険な操作` カード + `この書類を削除` ボタン
 *   - 右カラム `書類プレビュー` カード内 DocumentPreview（<h2> に `請 求 書`）
 *   - プレビューに `株式会社サンプル 御中`、明細テーブル、合計 `￥1,320,000`
 */
test('E2E-DOC-DETAIL-001: 初期表示（情報カード＋プレビュー）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step(`/documents/${d001Id} に遷移（一覧→行クリックで SPA 遷移）`, async () => {
    // Nextron (Next.js output:export) では `[id].tsx` は `placeholder/index.html`
    // として 1 つだけ書き出される動的ルート。直接 `app://./documents/{UUID}/`
    // を開くとファイルが無く、electron-serve の SPA フォールバックでダッシュ
    // ボードの index.html が返る。そのため、先に一覧（`/documents/`）を
    // 開いて SPA として hydrate させてから、行クリックで Next.js Router の
    // client-side 遷移で `/documents/${UUID}` に到達する（HIST-007 と同じ導線）。
    await page.goto('app://./documents/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr')).toHaveCount(15, {
      timeout: 15000,
    })
    await page.locator('tbody > tr').first().locator('td').nth(0).click()
    await expect(page).toHaveURL(
      new RegExp(`/documents/${d001Id}/?$`),
      { timeout: 10000 }
    )
    // Next.js のコード分割チャンクとデータ取得完了を待つ
    await page.waitForLoadState('networkidle')
    // 詳細ページ描画を確認（font-mono の書類番号 span が表示される）
    await expect(
      page.locator('span.font-mono').filter({ hasText: '2026-04-003' }).first()
    ).toBeVisible({ timeout: 20000 })
  })

  await test.step('<title> が「2026-04-003 — 請求書 — 事務ツール」', async () => {
    await expect(page).toHaveTitle('2026-04-003 — 請求書 — 事務ツール')
  })

  await test.step('h1 に「請求書」と「2026-04-003」が含まれる', async () => {
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toContainText('請求書')
    await expect(h1).toContainText('2026-04-003')
  })

  await test.step('サブヘッダ「発行日 2026/04/18 ／ 株式会社サンプル」', async () => {
    await expect(
      page.getByText('発行日 2026/04/18 ／ 株式会社サンプル', { exact: true })
    ).toBeVisible()
  })

  await test.step('ヘッダ右に4ボタン: 履歴に戻る / この書類を複製 / 編集（再発行）/ PDF再生成', async () => {
    await expect(
      page.getByRole('link', { name: /履歴に戻る/ }).first()
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'この書類を複製' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /編集（再発行）/ })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'PDF再生成' })
    ).toBeVisible()
  })

  const infoCard = page
    .locator('div')
    .filter({ has: page.getByText('書類情報', { exact: true }) })
    .first()

  await test.step('左カラム 書類情報カード内に 10 ラベルが存在', async () => {
    await expect(infoCard).toBeVisible()
    const labels = [
      '書類種別',
      '書類番号',
      '発行日',
      '取引先',
      '合計金額',
      '小計',
      '消費税',
      '送付状態',
      '作成日時',
      '更新日時',
    ]
    for (const label of labels) {
      await expect(
        infoCard.getByText(label, { exact: true }).first()
      ).toBeVisible()
    }
  })

  await test.step('危険な操作カード + destructive スタイルの「この書類を削除」ボタン', async () => {
    await expect(
      page.getByText('危険な操作', { exact: true })
    ).toBeVisible()
    const deleteBtn = page.getByRole('button', { name: 'この書類を削除' })
    await expect(deleteBtn).toBeVisible()
    // destructive スタイル（border-destructive/40 + text-destructive）の確認
    await expect(deleteBtn).toHaveClass(/text-destructive/)
  })

  const previewCard = page
    .locator('div')
    .filter({ has: page.getByText('書類プレビュー', { exact: true }) })
    .last()

  await test.step('右カラム 書類プレビューカード内 <h2> に「請 求 書」', async () => {
    await expect(previewCard).toBeVisible()
    await expect(previewCard.locator('h2').first()).toContainText('請 求 書')
  })

  await test.step('プレビューに「株式会社サンプル 御中」が表示', async () => {
    await expect(
      previewCard.getByText('株式会社サンプル 御中', { exact: false }).first()
    ).toBeVisible()
  })

  await test.step('プレビューに明細テーブルが存在', async () => {
    await expect(previewCard.locator('table').first()).toBeVisible()
  })

  await test.step('プレビューに合計 ￥1,320,000（￥/¥ 両方許容）', async () => {
    await expect(
      previewCard.getByText(/[￥¥]\s?1,320,000/).first()
    ).toBeVisible()
  })
})

/**
 * E2E-DOC-DETAIL-002: 書類種別バリエーション（全5種）
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-002) の
 * パラメータ化テーブルに従い、d001〜d005 を順に遷移して以下を検証する:
 *   - d001 (invoice):         h1 含む `請求書`  / <title> 含む `請求書`  / <h2> 含む `請 求 書`
 *   - d002 (quote):           h1 含む `見積書`  / <title> 含む `見積書`  / <h2> 含む `見 積 書`
 *   - d003 (receipt):         h1 含む `領収書`  / <title> 含む `領収書`  / <h2> 含む `領 収 書`
 *   - d004 (delivery_note):   h1 含む `納品書`  / <title> 含む `納品書`  / <h2> 含む `納 品 書`
 *   - d005 (payment_request): h1 含む `振込依頼書` / <title> 含む `振込依頼書` / <h2> 含む `振込依頼書`
 *
 * ナビゲーションは DETAIL-001 同様、一覧（`/documents/`）を hydrate させた後
 * に `router.push('/documents/{UUID}')` で SPA 遷移する（electron-serve の
 * SPA フォールバックで index.html が返らないようにするため）。
 */
test('E2E-DOC-DETAIL-002: 書類種別バリエーション（全5種）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)

  type Case = {
    label: string
    id: string
    headerText: string
    titleText: string
    previewH2: string
  }

  const cases: Case[] = [
    { label: 'd001', id: ids.d001, headerText: '請求書',   titleText: '請求書',   previewH2: '請 求 書' },
    { label: 'd002', id: ids.d002, headerText: '見積書',   titleText: '見積書',   previewH2: '見 積 書' },
    { label: 'd003', id: ids.d003, headerText: '領収書',   titleText: '領収書',   previewH2: '領 収 書' },
    { label: 'd004', id: ids.d004, headerText: '納品書',   titleText: '納品書',   previewH2: '納 品 書' },
    { label: 'd005', id: ids.d005, headerText: '振込依頼書', titleText: '振込依頼書', previewH2: '振込依頼書' },
  ]

  // 一覧ページを最初に開いて SPA を hydrate させる。
  await page.goto('app://./documents/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })

  for (const c of cases) {
    await test.step(`${c.label} (${c.headerText}) の遷移と検証`, async () => {
      // Next.js Router の client-side 遷移で `/documents/{UUID}` へ。
      await page.evaluate((docId) => {
        type NextWindow = Window & {
          next?: { router?: { push: (url: string) => Promise<boolean> } }
        }
        const w = window as NextWindow
        return w.next?.router?.push(`/documents/${docId}`)
      }, c.id)

      await expect(page).toHaveURL(
        new RegExp(`/documents/${c.id}/?$`),
        { timeout: 10000 }
      )
      await page.waitForLoadState('networkidle')

      // ヘッダ見出し（h1）に種別ラベルが含まれる
      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toContainText(c.headerText, { timeout: 15000 })

      // <title> に種別ラベルが含まれる
      await expect(page).toHaveTitle(new RegExp(c.titleText))

      // プレビューカード内 <h2> に種別ごとの中央揃えタイトルが含まれる
      const previewCard = page
        .locator('div')
        .filter({ has: page.getByText('書類プレビュー', { exact: true }) })
        .last()
      await expect(previewCard).toBeVisible()
      await expect(previewCard.locator('h2').first()).toContainText(c.previewH2)

      // 次のケースに備えて履歴に戻る（`履歴に戻る` リンク経由の SPA 遷移）
      await page.getByRole('link', { name: /履歴に戻る/ }).first().click()
      await expect(page).toHaveURL(/\/documents\/?$/, { timeout: 10000 })
      await expect(page.locator('tbody > tr')).toHaveCount(15, {
        timeout: 15000,
      })
    })
  }
})

/**
 * 書類詳細ページ（d001）にナビゲートして書類番号描画を待つヘルパー。
 *
 * DETAIL-003/004/005 は共通して `/documents/{d001}/` から各ボタン/リンクを
 * 操作するため、共通前提として一覧→行クリックの SPA 遷移で詳細ページに
 * 到達させる（DETAIL-001 と同じ導線）。
 */
const navigateToD001Detail = async (
  page: import('@playwright/test').Page,
  d001Id: string
): Promise<void> => {
  await page.goto('app://./documents/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('tbody > tr')).toHaveCount(15, { timeout: 15000 })
  await page.locator('tbody > tr').first().locator('td').nth(0).click()
  await expect(page).toHaveURL(new RegExp(`/documents/${d001Id}/?$`), {
    timeout: 10000,
  })
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('span.font-mono').filter({ hasText: '2026-04-003' }).first()
  ).toBeVisible({ timeout: 20000 })
}

/**
 * E2E-DOC-DETAIL-003: 履歴に戻るボタン
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-003):
 *   - `/documents/{d001 UUID}/` で `履歴に戻る` リンクをクリック
 *   - URL が `/documents` に遷移する
 */
test('E2E-DOC-DETAIL-003: 履歴に戻るボタン', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step(`/documents/${d001Id} に遷移（一覧→行クリック SPA 遷移）`, async () => {
    await navigateToD001Detail(page, d001Id)
  })

  await test.step('「履歴に戻る」リンクをクリックして /documents に戻る', async () => {
    await page.getByRole('link', { name: /履歴に戻る/ }).first().click()
    await expect(page).toHaveURL(/\/documents\/?$/, { timeout: 10000 })
  })
})

/**
 * E2E-DOC-DETAIL-004: 複製 → 新規作成へ遷移
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-004):
 *   - `この書類を複製` ボタンをクリック
 *   - URL が `/documents/new?from={d001 UUID}` に遷移する
 */
test('E2E-DOC-DETAIL-004: 複製 → 新規作成へ遷移', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step(`/documents/${d001Id} に遷移（一覧→行クリック SPA 遷移）`, async () => {
    await navigateToD001Detail(page, d001Id)
  })

  await test.step('「この書類を複製」ボタンをクリックして /documents/new?from={id} に遷移', async () => {
    await page.getByRole('button', { name: 'この書類を複製' }).click()
    // URL: /documents/new?from={d001Id}（末尾スラッシュ・クエリ順序許容の正規表現）
    await expect(page).toHaveURL(
      new RegExp(`/documents/new/?\\?.*from=${d001Id}`),
      { timeout: 10000 }
    )
  })
})

/**
 * E2E-DOC-DETAIL-005: 編集（再発行扱い）→ 新規作成へ遷移
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-005):
 *   - `編集（再発行）` ボタンをクリック
 *   - URL が `/documents/new?base={d001 UUID}` に遷移する
 */
test('E2E-DOC-DETAIL-005: 編集（再発行）→ 新規作成へ遷移', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step(`/documents/${d001Id} に遷移（一覧→行クリック SPA 遷移）`, async () => {
    await navigateToD001Detail(page, d001Id)
  })

  await test.step('「編集（再発行）」ボタンをクリックして /documents/new?base={id} に遷移', async () => {
    await page.getByRole('button', { name: /編集（再発行）/ }).click()
    // URL: /documents/new?base={d001Id}（末尾スラッシュ・クエリ順序許容の正規表現）
    await expect(page).toHaveURL(
      new RegExp(`/documents/new/?\\?.*base=${d001Id}`),
      { timeout: 10000 }
    )
  })
})

/**
 * 会社基本情報を 1 件シード（PDF 再生成時に main/ipc/company.get が null だと
 * `会社基本情報が未登録です` で例外を投げるため）。DETAIL-006 の事前条件。
 */
const seedCompanyInfo = async (
  page: import('@playwright/test').Page
): Promise<void> => {
  await page.waitForFunction(
    () => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined',
    undefined,
    { timeout: 30000 }
  )
  await page.evaluate(async () => {
    type IpcBridge = {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    }
    const ipc = (window as unknown as { ipc: IpcBridge }).ipc
    await ipc.invoke('company:update', {
      name: 'E2E テスト株式会社',
      tradeName: null,
      postalCode: '100-0001',
      address: '東京都千代田区千代田1-1',
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
  })
}

/**
 * E2E-DOC-DETAIL-006: PDF再生成
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-006):
 *   - Phase 4 仕様: `PDF再生成` ボタンクリック → alert『PDF再生成（仮）: 2026-04-003』
 *   - Phase 8 実装: `useGeneratePdf` → IPC `documents:generate-pdf`（company:get 必須）
 *     成功時: alert『PDFを再生成しました: 2026-04-003』（`renderer/pages/documents/[id].tsx` L153-157）
 *   - spec 補足に従い「UI 差替後はテスト手順を更新」。仕様の本質:
 *       - ボタンが機能する（dialog が 1 回以上発火、メッセージに書類番号が含まれる）
 *       - URL は `/documents/{d001Id}` のまま変化しない
 *   - 事前に `company:update` を実行して PDF 生成失敗を回避する（CLAUDE.md / SCOPE_PROGRESS.md 指針）。
 */
test('E2E-DOC-DETAIL-006: PDF再生成', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  await test.step('会社基本情報をシード（PDF 生成の前提条件）', async () => {
    await seedCompanyInfo(page)
  })

  await test.step(`/documents/${d001Id} に遷移（一覧→行クリック SPA 遷移）`, async () => {
    await navigateToD001Detail(page, d001Id)
  })

  await test.step('「PDF再生成」ボタンをクリック → dialog 発火、URL は保持', async () => {
    const dialogMessages: string[] = []
    const onDialog = (d: import('@playwright/test').Dialog): void => {
      dialogMessages.push(d.message())
      void d.accept()
    }
    page.on('dialog', onDialog)

    await page.getByRole('button', { name: 'PDF再生成' }).click()

    // dialog が 1 件発火するまで待機（Phase 8 の IPC 呼び出しがあるため 30s 許容）
    await expect
      .poll(() => dialogMessages.length, { timeout: 30000 })
      .toBeGreaterThanOrEqual(1)

    // メッセージは Phase 4 仕様「PDF再生成（仮）: 2026-04-003」または
    // Phase 8 実装「PDFを再生成しました: 2026-04-003」のいずれかで、
    // 書類番号 `2026-04-003` を必ず含む
    expect(dialogMessages[0]).toMatch(/2026-04-003/)
    expect(dialogMessages[0]).toMatch(
      /(PDF再生成（仮）|PDFを再生成しました)/
    )

    // URL は `/documents/{d001Id}` のまま（仕様: accept 後も遷移しない）
    await expect(page).toHaveURL(new RegExp(`/documents/${d001Id}/?$`))

    page.off('dialog', onDialog)
  })
})

/**
 * E2E-DOC-DETAIL-007: 削除（OK／キャンセル分岐）
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-007):
 *   - (a) confirm『書類「2026-04-003」を削除しますか？』で OK:
 *       - Phase 4 仕様: alert『削除（仮）：コンソールに出力しました』、URLは保持
 *       - Phase 8 実装（`[id].tsx` L171-180）: `deleteMutation` 実行 → 成功時
 *         `router.push('/documents')` で履歴ページに遷移し、詳細から消える
 *       - 仕様の本質: confirm OK 時に削除が進行する（遷移 or 詳細から消える）
 *   - (b) confirm キャンセル:
 *       - 以降のダイアログは発火せず、URL は `/documents/{d001Id}` のまま
 *
 * 実行順序は (b) → (a) とし、最初にキャンセル分岐を検証し、次に OK 分岐で
 * 実際の削除を実行する（共有 Electron コンテキストの状態を壊さないため最後に）。
 */
test('E2E-DOC-DETAIL-007: 削除（OK／キャンセル分岐）', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const ids = getSeededDocumentIds(seeded)
  const d001Id = ids.d001

  // ---------- (b) キャンセル分岐 ----------
  await test.step(`/documents/${d001Id} に遷移（一覧→行クリック SPA 遷移）`, async () => {
    await navigateToD001Detail(page, d001Id)
  })

  await test.step('(b) confirm キャンセル → URL は保持、以降の dialog は発火しない', async () => {
    const dialogMessages: string[] = []
    const onDialogDismiss = (d: import('@playwright/test').Dialog): void => {
      dialogMessages.push(d.message())
      // 最初の confirm のみキャンセル。以降発火したら即 accept（想定外）
      if (d.type() === 'confirm' && dialogMessages.length === 1) {
        void d.dismiss()
      } else {
        void d.accept()
      }
    }
    page.on('dialog', onDialogDismiss)

    await page.getByRole('button', { name: 'この書類を削除' }).click()

    // confirm が 1 件発火するまで待機
    await expect
      .poll(() => dialogMessages.length, { timeout: 10000 })
      .toBeGreaterThanOrEqual(1)
    expect(dialogMessages[0]).toBe(
      `書類「2026-04-003」を削除しますか？`
    )

    // キャンセル後は後続の alert が発火しないことを 1.5 秒確認
    await page.waitForTimeout(1500)
    expect(dialogMessages.length).toBe(1)

    // URL は保持
    await expect(page).toHaveURL(new RegExp(`/documents/${d001Id}/?$`))

    page.off('dialog', onDialogDismiss)
  })

  // ---------- (a) OK 分岐 ----------
  await test.step('(a) confirm OK → 削除が進行（Phase 8: /documents に遷移 or 詳細から消える）', async () => {
    const dialogMessages: string[] = []
    const onDialogAccept = (d: import('@playwright/test').Dialog): void => {
      dialogMessages.push(d.message())
      void d.accept()
    }
    page.on('dialog', onDialogAccept)

    await page.getByRole('button', { name: 'この書類を削除' }).click()

    // confirm が発火
    await expect
      .poll(() => dialogMessages.length, { timeout: 10000 })
      .toBeGreaterThanOrEqual(1)
    expect(dialogMessages[0]).toBe(
      `書類「2026-04-003」を削除しますか？`
    )

    // 仕様の本質: OK 時は削除が進行する。Phase 4 は alert + URL 保持、
    // Phase 8 実装は `router.push('/documents')`。どちらでも成立する
    // 「詳細ページが表示されなくなる」条件で検証する。
    // 具体的には: (1) URL が `/documents` に遷移する、または
    //           (2) alert『削除（仮）：…』が発火する、のいずれか。
    await expect
      .poll(
        () =>
          // 遷移したか、alert（削除系メッセージ）が発火したか
          /\/documents\/?$/.test(page.url()) ||
          dialogMessages.some((m) => /削除/.test(m) && m !== dialogMessages[0]),
        { timeout: 15000 }
      )
      .toBe(true)

    page.off('dialog', onDialogAccept)
  })
})

/**
 * E2E-DOC-DETAIL-008: 存在しないIDのエラー画面
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-008):
 *   - Phase 4 仕様: `/documents/zzz` にアクセス（getStaticPaths に `zzz` 登録済）
 *   - Phase 8 実装: getStaticPaths は `placeholder` のみ。main プロセスの
 *     `registerFileProtocol` が `/documents/{uuid}/` を placeholder HTML に
 *     SPA フォールバックし、CSR で `useDocument` が IPC `documents:get` を
 *     呼び結果 null → 「書類が見つかりません」カード表示（`[id].tsx` L195-221）
 *   - 仕様書は `/documents/zzz` を想定するが、仕様補足に従い任意の未登録
 *     UUID でも同じ画面に到達できる。ここでは決定論的な
 *     `00000000-0000-0000-0000-000000000000` を使用する。
 *
 * 期待結果:
 *   - `<title>` = `書類が見つかりません — 事務ツール`
 *   - 見出し `書類が見つかりません`
 *   - 説明文 `指定された書類ID「{id}」は存在しないか、削除された可能性があります。`
 *   - `履歴に戻る` ボタンが表示され、クリックで `/documents` に遷移
 */
test('E2E-DOC-DETAIL-008: 存在しないIDのエラー画面', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const nonExistentId = '00000000-0000-0000-0000-000000000000'

  await test.step('一覧を hydrate してから SPA 遷移で /documents/{未登録UUID} を開く', async () => {
    // 直接 `app://./documents/{uuid}/` に goto すると placeholder HTML が
    // 返るが、hydrate 後は SPA として動作する。DETAIL-001 と同じ導線で
    // まず一覧を開いて Next.js Router をブートし、次に router.push する。
    await page.goto('app://./documents/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr').first()).toBeVisible({
      timeout: 15000,
    })

    await page.evaluate((docId) => {
      type NextWindow = Window & {
        next?: { router?: { push: (url: string) => Promise<boolean> } }
      }
      const w = window as NextWindow
      return w.next?.router?.push(`/documents/${docId}`)
    }, nonExistentId)

    await expect(page).toHaveURL(
      new RegExp(`/documents/${nonExistentId}/?$`),
      { timeout: 10000 }
    )
    await page.waitForLoadState('networkidle')
  })

  await test.step('<title> が「書類が見つかりません — 事務ツール」', async () => {
    await expect(page).toHaveTitle('書類が見つかりません — 事務ツール', {
      timeout: 15000,
    })
  })

  await test.step('見出し「書類が見つかりません」が表示', async () => {
    await expect(
      page.getByText('書類が見つかりません', { exact: true }).first()
    ).toBeVisible()
  })

  await test.step('説明文に「指定された書類ID「{id}」は存在しないか、削除された可能性があります。」', async () => {
    await expect(
      page.getByText(
        `指定された書類ID「${nonExistentId}」は存在しないか、削除された可能性があります。`
      )
    ).toBeVisible()
  })

  await test.step('「履歴に戻る」ボタンが表示、クリックで /documents に遷移', async () => {
    const backLink = page.getByRole('link', { name: /履歴に戻る/ }).first()
    await expect(backLink).toBeVisible()
    await backLink.click()
    await expect(page).toHaveURL(/\/documents\/?$/, { timeout: 10000 })
  })
})

/**
 * E2E-DOC-DETAIL-009: 情報カードのフォーマット検証
 *
 * spec (docs/e2e-specs/document-detail-e2e.md §TC E2E-DOC-DETAIL-009):
 *   - `/documents/{d001 UUID}/` で情報カード内の各値を検証
 *   - 書類種別: `請求書`
 *   - 書類番号: `2026-04-003`（font-mono）
 *   - 発行日: `2026/04/18`
 *   - 取引先: `株式会社サンプル 御中`
 *   - 合計金額: `￥1,320,000`（`span.text-base.font-semibold`）
 *   - 小計: `￥1,200,000` / 消費税: `￥120,000`
 *   - 送付状態バッジ: 仕様書では「未送付」だが実装は `pdfFilePath` に応じて
 *     `PDF未生成` / `PDF生成済み` を表示（`[id].tsx` L310-322）。シード直後は
 *     `pdfFilePath=null` のため `PDF未生成` バッジ
 *   - 作成日時 / 更新日時: `yyyy/MM/dd HH:mm` 形式（TZ 依存のため値ではなく
 *     形式のみ検証）
 */
test('E2E-DOC-DETAIL-009: 情報カードのフォーマット検証', async () => {
  if (!ctx || !seeded) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  // DETAIL-007 が d001 を削除済みの可能性があるため、削除されていない
  // d002（見積書）ではなく、再シードなしで d001 が残っていることは保証できない。
  // ここでは一覧から「2026-04-003」の行（＝ d001）を探し、存在すればクリック、
  // 存在しなければ再シードして d001 を取り直す…ではなく、検証対象は DETAIL-001
  // と同じ d001（請求書 / 2026-04-003）に固定する必要がある。
  //
  // 仕様書通りの値を検証するため、d001 が削除済みなら再シードして ID を取り直す。
  const ensureD001 = async (): Promise<string> => {
    const ids = getSeededDocumentIds(seeded!)
    const candidateId = ids.d001
    // ipc.documents:get で存在確認
    const exists = await page.evaluate(async (docId) => {
      type IpcBridge = {
        invoke<T>(channel: string, ...args: unknown[]): Promise<T>
      }
      const ipc = (window as unknown as { ipc: IpcBridge }).ipc
      const doc = await ipc.invoke<unknown | null>('documents:get', docId)
      return doc !== null
    }, candidateId)
    if (exists) return candidateId
    // DETAIL-007 で削除された場合は、seed で投入した他の documents のうち
    // 請求書 2026-04-003 を新たに作り直す
    const reSeeded = await seedHistoryData(page)
    seeded = reSeeded
    return getSeededDocumentIds(reSeeded).d001
  }

  const d001Id = await ensureD001()

  await test.step(`/documents/${d001Id} に遷移（SPA router.push）`, async () => {
    // navigateToD001Detail は行数 15 を期待するが、DETAIL-007 の削除後に
    // 再シードすると 14+新規 1 で 15 にならない（既存 14 件 + 新 15 件 = 29 件）。
    // そのためここでは一覧 hydrate のみ行い、router.push で直接遷移する。
    await page.goto('app://./documents/')
    await page.waitForLoadState('networkidle')
    // 一覧の行が少なくとも 1 件描画されるのを待つ（router の準備完了の指標）
    await expect(page.locator('tbody > tr').first()).toBeVisible({
      timeout: 15000,
    })
    await page.evaluate((docId) => {
      type NextWindow = Window & {
        next?: { router?: { push: (url: string) => Promise<boolean> } }
      }
      const w = window as NextWindow
      return w.next?.router?.push(`/documents/${docId}`)
    }, d001Id)
    await expect(page).toHaveURL(new RegExp(`/documents/${d001Id}/?$`), {
      timeout: 10000,
    })
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('span.font-mono').filter({ hasText: '2026-04-003' }).first()
    ).toBeVisible({ timeout: 20000 })
  })

  const infoCard = page
    .locator('div')
    .filter({ has: page.getByText('書類情報', { exact: true }) })
    .first()

  await test.step('書類種別: 請求書', async () => {
    await expect(
      infoCard.getByText('請求書', { exact: true }).first()
    ).toBeVisible()
  })

  await test.step('書類番号: 2026-04-003 （font-mono クラス）', async () => {
    const numberSpan = infoCard
      .locator('span.font-mono')
      .filter({ hasText: '2026-04-003' })
      .first()
    await expect(numberSpan).toBeVisible()
    await expect(numberSpan).toHaveText('2026-04-003')
  })

  await test.step('発行日: 2026/04/18', async () => {
    await expect(
      infoCard.getByText('2026/04/18', { exact: true }).first()
    ).toBeVisible()
  })

  await test.step('取引先: 株式会社サンプル 御中', async () => {
    await expect(
      infoCard.getByText('株式会社サンプル 御中', { exact: true }).first()
    ).toBeVisible()
  })

  await test.step('合計金額: ￥1,320,000 （text-base.font-semibold）', async () => {
    const totalSpan = infoCard
      .locator('span.text-base.font-semibold')
      .filter({ hasText: /[￥¥]\s?1,320,000/ })
      .first()
    await expect(totalSpan).toBeVisible()
  })

  await test.step('小計: ￥1,200,000', async () => {
    await expect(
      infoCard.getByText(/[￥¥]\s?1,200,000/).first()
    ).toBeVisible()
  })

  await test.step('消費税: ￥120,000', async () => {
    await expect(
      infoCard.getByText(/[￥¥]\s?120,000/).first()
    ).toBeVisible()
  })

  await test.step('送付状態バッジ（PDF未生成 または PDF生成済み）', async () => {
    // 仕様書の「未送付」は Phase 4 時点の mock 表記。実装では pdfFilePath の
    // 有無で `PDF未生成` / `PDF生成済み` のいずれかが表示される。シード直後は
    // pdfFilePath=null のため `PDF未生成` が期待値だが、DETAIL-006 の PDF 再生成が
    // 先行すると `PDF生成済み` になっている可能性がある。どちらでも OK。
    await expect(
      infoCard.getByText(/^(PDF未生成|PDF生成済み)$/).first()
    ).toBeVisible()
  })

  await test.step('作成日時 / 更新日時: yyyy/MM/dd HH:mm 形式', async () => {
    // InfoRow は `<div class="flex items-start justify-between gap-4">
    //   <span class="text-xs text-muted-foreground">ラベル</span>
    //   <span class="text-right text-sm">{値}</span>
    // </div>` 構造。ラベル span を起点に `+ span`（隣接兄弟）で値 span に辿り着く。
    const dateFormat = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/

    // 作成日時の値 span（ラベル span の次の兄弟）
    const createdValue = await infoCard
      .locator('span.text-xs.text-muted-foreground', { hasText: /^作成日時$/ })
      .locator('xpath=following-sibling::span[1]')
      .first()
      .textContent()
    expect(createdValue?.trim()).toMatch(dateFormat)

    const updatedValue = await infoCard
      .locator('span.text-xs.text-muted-foreground', { hasText: /^更新日時$/ })
      .locator('xpath=following-sibling::span[1]')
      .first()
      .textContent()
    expect(updatedValue?.trim()).toMatch(dateFormat)
  })
})
