import { test, expect } from '@playwright/test'
import { format } from 'date-fns'
import { launchElectron, closeElectron, type LaunchResult } from './helpers/electronApp'
import { seedDashboardTestData } from './helpers/seed'

let ctx: LaunchResult | undefined
let seededDocumentIds: string[] = []

test.beforeAll(async () => {
  ctx = await launchElectron()
  // Seed is done here (not per-test) so DASH-001/002 still work with empty DB
  // if run alone, while DASH-003 gets data when focused via test.only().
  // But DASH-001's assertions (heading, buttons, cards) don't depend on empty
  // state — seeding is safe for them too.
  const { documents } = await seedDashboardTestData(ctx.page)
  seededDocumentIds = documents.map((d) => d.id)
  // Reload so the dashboard picks up the seeded rows on its first render.
  await ctx.page.reload()
  await ctx.page.waitForLoadState('networkidle')
})

test.afterAll(async () => {
  if (ctx) await closeElectron(ctx)
})

test('E2E-DASH-001: ダッシュボード初期表示', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  // Collect browser console logs for diagnostics
  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('ダッシュボードが読み込まれる', async () => {
    // Production build loads at app://./ (index.html). Wait for network idle.
    await page.waitForLoadState('networkidle')
  })

  await test.step('h1「ダッシュボード」が可視', async () => {
    const heading = page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    await expect(heading).toBeVisible()
  })

  await test.step('説明文が表示される', async () => {
    await expect(
      page.getByText('最近の書類と、書類種別ごとのクイック作成が利用できます。')
    ).toBeVisible()
  })

  await test.step('クイック作成セクション見出しが表示される', async () => {
    await expect(page.getByText('クイック作成', { exact: true })).toBeVisible()
  })

  await test.step('クイック作成ボタン5個が表示される', async () => {
    const labels = ['請求書', '領収書', '見積書', '振込依頼書', '納品書']
    for (const label of labels) {
      await expect(
        page.getByRole('button', { name: label, exact: true })
      ).toBeVisible()
    }
  })

  await test.step('最近発行した書類カードが表示される', async () => {
    await expect(page.getByText('最近発行した書類', { exact: true })).toBeVisible()
    await expect(page.getByText('直近5件を表示', { exact: true })).toBeVisible()
  })

  await test.step('今月の発行件数カードが現在年月ラベルを表示', async () => {
    const monthLabel = format(new Date(), 'yyyy年M月')
    await expect(page.getByText('今月の発行件数', { exact: true })).toBeVisible()
    await expect(page.getByText(monthLabel, { exact: true })).toBeVisible()
  })

  await test.step('「書類履歴をすべて見る」ボタンが表示される', async () => {
    await expect(
      page.getByRole('button', { name: '書類履歴をすべて見る' })
    ).toBeVisible()
  })
})

test('E2E-DASH-002: クイック作成フロー（全5種）', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const cases: { label: string; type: string }[] = [
    { label: '請求書', type: 'invoice' },
    { label: '領収書', type: 'receipt' },
    { label: '見積書', type: 'quote' },
    { label: '振込依頼書', type: 'payment_request' },
    { label: '納品書', type: 'delivery_note' },
  ]

  const getPathSearch = (): string => {
    try {
      const u = new URL(page.url())
      return `${u.pathname}${u.search}`
    } catch {
      return page.url()
    }
  }

  const ensureOnDashboard = async (): Promise<void> => {
    const path = getPathSearch()
    // Dashboard is served at root (e.g. '/' or '/index.html').
    const onDashboard = /^\/(index\.html)?$/.test(path)
    if (!onDashboard) {
      await page.goBack()
      await page.waitForLoadState('networkidle')
    }
    await expect(
      page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    ).toBeVisible()
  }

  for (const { label, type } of cases) {
    await test.step(`${label} → /documents/new?type=${type}`, async () => {
      await ensureOnDashboard()

      // Wait for the button to be stable before clicking
      // (Next.js client-side nav can briefly re-render after route settles).
      const button = page.getByRole('button', { name: label, exact: true })
      await expect(button).toBeVisible()

      await button.click()

      // Verify URL path + search match the expected destination.
      // In Nextron production build URL looks like `app://./documents/new/?type=invoice`.
      await expect
        .poll(getPathSearch, { timeout: 10000 })
        .toMatch(new RegExp(`/documents/new/?\\?type=${type}(?:$|&)`))
    })
  }
})

test('E2E-DASH-003: 最近書類の行クリックで詳細遷移', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const getPathSearch = (): string => {
    try {
      const u = new URL(page.url())
      return `${u.pathname}${u.search}`
    } catch {
      return page.url()
    }
  }

  await test.step('ダッシュボードに戻る', async () => {
    const path = getPathSearch()
    const onDashboard = /^\/(index\.html)?$/.test(path)
    if (!onDashboard) {
      // Navigate back to the app root reliably.
      await page.goto('app://./')
      await page.waitForLoadState('networkidle')
    }
    await expect(
      page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    ).toBeVisible()
  })

  await test.step('最近発行テーブルに行が描画される', async () => {
    // The recent-documents section renders a <table> once data arrives.
    const table = page
      .locator('section')
      .filter({ hasText: '最近発行した書類' })
      .locator('table')
    await expect(table).toBeVisible({ timeout: 10000 })
    const rows = table.locator('tbody > tr')
    await expect.poll(async () => rows.count()).toBeGreaterThan(0)
  })

  await test.step('1行目をクリックして /documents/{id} に遷移', async () => {
    const firstRow = page
      .locator('section')
      .filter({ hasText: '最近発行した書類' })
      .locator('table tbody > tr')
      .first()

    // Verify cursor-pointer style is applied (任意検証 per spec).
    await expect(firstRow).toHaveClass(/cursor-pointer/)

    await firstRow.click()

    // Expect navigation to /documents/{id} where id is one of the seeded docs.
    // Seeded IDs are UUIDs (main/helpers/id.ts uses randomUUID()), the spec's
    // "id=1" is illustrative; the real contract is /documents/{id}.
    const idAlternation = seededDocumentIds
      .map((id) => id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
      .join('|')
    const expected = new RegExp(`/documents/(?:${idAlternation})/?$`)

    await expect.poll(getPathSearch, { timeout: 10000 }).toMatch(expected)
  })
})

test('E2E-DASH-004: 最近書類のフォーマット検証', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const getPathSearch = (): string => {
    try {
      const u = new URL(page.url())
      return `${u.pathname}${u.search}`
    } catch {
      return page.url()
    }
  }

  await test.step('ダッシュボードに戻る', async () => {
    const path = getPathSearch()
    const onDashboard = /^\/(index\.html)?$/.test(path)
    if (!onDashboard) {
      await page.goto('app://./')
      await page.waitForLoadState('networkidle')
    }
    await expect(
      page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    ).toBeVisible()
  })

  const table = page
    .locator('section')
    .filter({ hasText: '最近発行した書類' })
    .locator('table')

  await test.step('テーブルに5行描画される', async () => {
    await expect(table).toBeVisible({ timeout: 10000 })
    const rows = table.locator('tbody > tr')
    await expect.poll(async () => rows.count()).toBe(5)
  })

  const rows = table.locator('tbody > tr')
  const allowedTypeLabels = ['請求書', '領収書', '見積書', '振込依頼書', '納品書']
  const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/
  // Spec (dashboard-e2e.md TC-004) specifies `￥1,320,000` using the full-width
  // yen sign U+FFE5 (Intl.NumberFormat ja-JP JPY output). Accept either the
  // full-width ￥ or half-width ¥ so we do not couple to a specific glyph.
  const currencyRegex = /^[￥¥][\d,]+$/

  for (let i = 0; i < 5; i++) {
    await test.step(`行${i + 1}のセルフォーマット検証`, async () => {
      const row = rows.nth(i)
      const cells = row.locator('td')

      // 発行日セル (col 1): yyyy/MM/dd
      const issueDate = (await cells.nth(0).innerText()).trim()
      expect(issueDate).toMatch(dateRegex)

      // 書類種別セル (col 2): 5種のいずれか
      const typeLabel = (await cells.nth(1).innerText()).trim()
      expect(allowedTypeLabels).toContain(typeLabel)

      // 書類番号セル (col 4): font-mono クラスを含む
      const numberCell = cells.nth(3)
      await expect(numberCell).toHaveClass(/font-mono/)

      // 金額セル (col 5): ￥ + 3桁区切り
      const amount = (await cells.nth(4).innerText()).trim()
      expect(amount).toMatch(currencyRegex)
    })
  }
})

test('E2E-DASH-005: 今月サマリ表示', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const getPathSearch = (): string => {
    try {
      const u = new URL(page.url())
      return `${u.pathname}${u.search}`
    } catch {
      return page.url()
    }
  }

  await test.step('ダッシュボードに戻る', async () => {
    const path = getPathSearch()
    const onDashboard = /^\/(index\.html)?$/.test(path)
    if (!onDashboard) {
      await page.goto('app://./')
      await page.waitForLoadState('networkidle')
    }
    await expect(
      page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    ).toBeVisible()
  })

  // 今月サマリカード（"今月の発行件数"セクション）を特定
  const summaryCard = page
    .locator('div.rounded-lg')
    .filter({ hasText: '今月の発行件数' })
    .first()

  await test.step('カードが可視', async () => {
    await expect(summaryCard).toBeVisible({ timeout: 10000 })
  })

  await test.step('ヘッダーに現在年月ラベルが表示される', async () => {
    const monthLabel = format(new Date(), 'yyyy年M月')
    await expect(summaryCard.getByText(monthLabel, { exact: true })).toBeVisible()
  })

  await test.step('総件数 12 と「件発行」が表示される', async () => {
    // 総件数は text-3xl で大きく表示される div
    await expect(
      summaryCard.locator('div.text-3xl').filter({ hasText: /^\s*12\s*$/ })
    ).toBeVisible()
    await expect(summaryCard.getByText('件発行', { exact: true })).toBeVisible()
  })

  await test.step('内訳 5 行が期待値どおり表示される', async () => {
    const expectations: { label: string; count: string }[] = [
      { label: '請求書', count: '5件' },
      { label: '領収書', count: '3件' },
      { label: '見積書', count: '2件' },
      { label: '振込依頼書', count: '1件' },
      { label: '納品書', count: '1件' },
    ]

    for (const { label, count } of expectations) {
      const row = summaryCard
        .locator('div.flex')
        .filter({ hasText: label })
        .filter({ hasText: count })
      await expect(row).toBeVisible()
    }
  })
})

test.only('E2E-DASH-006: 書類履歴をすべて見る', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const getPathSearch = (): string => {
    try {
      const u = new URL(page.url())
      return `${u.pathname}${u.search}`
    } catch {
      return page.url()
    }
  }

  await test.step('ダッシュボードに戻る', async () => {
    const path = getPathSearch()
    const onDashboard = /^\/(index\.html)?$/.test(path)
    if (!onDashboard) {
      await page.goto('app://./')
      await page.waitForLoadState('networkidle')
    }
    await expect(
      page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    ).toBeVisible()
  })

  await test.step('「書類履歴をすべて見る」ボタンをクリック', async () => {
    const button = page.getByRole('button', { name: '書類履歴をすべて見る' })
    await expect(button).toBeVisible()
    await button.click()
  })

  await test.step('URLが /documents に遷移する', async () => {
    // Nextron production build URL may look like `app://./documents/` (trailing slash)
    // or `app://./documents`. Accept either form, and ensure no further segments.
    await expect
      .poll(getPathSearch, { timeout: 10000 })
      .toMatch(/^\/documents\/?(?:index\.html)?$/)
  })
})
