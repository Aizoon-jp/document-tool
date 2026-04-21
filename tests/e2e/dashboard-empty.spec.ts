import { test, expect } from '@playwright/test'
import { format } from 'date-fns'
import { launchElectron, closeElectron, type LaunchResult } from './helpers/electronApp'

/**
 * E2E-DASH-007: 空状態（最近書類ゼロ件）
 *
 * documents テーブルが空の状態でダッシュボードが破綻しないことを検証する。
 * 共通の dashboard.spec.ts では beforeAll でサンプルデータを投入しているため、
 * 本シナリオは独立した Electron インスタンス（= 独立した一時 userData / 空DB）
 * を立ち上げて検証する。シードは一切実行しない。
 */

let ctx: LaunchResult | undefined

test.beforeAll(async () => {
  ctx = await launchElectron()
  // No seeding: fresh userData dir → fresh empty SQLite DB.
  // Ensure the dashboard has reached a settled state on its initial render.
  await ctx.page.waitForLoadState('networkidle')
})

test.afterAll(async () => {
  if (ctx) await closeElectron(ctx)
})

test.only('E2E-DASH-007: 空状態（最近書類ゼロ件）', async () => {
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

  await test.step('ダッシュボードが例外なく描画される', async () => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'ダッシュボード' })
    ).toBeVisible()
  })

  await test.step('クイック作成ボタン5個が表示される', async () => {
    const labels = ['請求書', '領収書', '見積書', '振込依頼書', '納品書']
    for (const label of labels) {
      await expect(
        page.getByRole('button', { name: label, exact: true })
      ).toBeVisible()
    }
  })

  await test.step('両カード（最近書類 / 今月サマリ）が可視', async () => {
    await expect(page.getByText('最近発行した書類', { exact: true })).toBeVisible()
    await expect(page.getByText('直近5件を表示', { exact: true })).toBeVisible()
    await expect(page.getByText('今月の発行件数', { exact: true })).toBeVisible()
    const monthLabel = format(new Date(), 'yyyy年M月')
    await expect(page.getByText(monthLabel, { exact: true })).toBeVisible()
  })

  await test.step('最近発行テーブルの tbody > tr が 0 行', async () => {
    // 空状態の実装ではテーブル自体が描画されず、代わりに案内テキストが出る。
    // どちらの実装形態でも「tbody > tr の count が 0」であることを検証する。
    const recentSection = page
      .locator('section')
      .filter({ hasText: '最近発行した書類' })

    // ローディングが完了して空状態メッセージが出るまで待つ。
    // 実装: `recent.length === 0` のときに当該テキストを表示。
    await expect(
      recentSection.getByText('書類がまだ発行されていません', { exact: true })
    ).toBeVisible({ timeout: 10000 })

    const rows = recentSection.locator('table tbody > tr')
    await expect.poll(async () => rows.count()).toBe(0)
  })

  // 今月サマリカードを特定
  const summaryCard = page
    .locator('div.rounded-lg')
    .filter({ hasText: '今月の発行件数' })
    .first()

  await test.step('総件数が 0 と表示される', async () => {
    await expect(summaryCard).toBeVisible({ timeout: 10000 })
    // 読み込み完了を待つ: 「読み込み中...」が消え、text-3xl の数値が描画される。
    await expect(
      summaryCard.locator('div.text-3xl').filter({ hasText: /^\s*0\s*$/ })
    ).toBeVisible({ timeout: 10000 })
    await expect(summaryCard.getByText('件発行', { exact: true })).toBeVisible()
  })

  await test.step('内訳 5 種すべて 0 件', async () => {
    const labels = ['請求書', '領収書', '見積書', '振込依頼書', '納品書']
    for (const label of labels) {
      const row = summaryCard
        .locator('div.flex')
        .filter({ hasText: label })
        .filter({ hasText: '0件' })
      await expect(row).toBeVisible()
    }
  })

  await test.step('クイック作成ボタンは通常どおり動作（請求書で遷移確認）', async () => {
    const button = page.getByRole('button', { name: '請求書', exact: true })
    await expect(button).toBeVisible()
    await button.click()

    await expect
      .poll(getPathSearch, { timeout: 10000 })
      .toMatch(/\/documents\/new\/?\?type=invoice(?:$|&)/)
  })
})
