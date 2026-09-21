import { test, expect } from '@playwright/test'
import {
  launchElectron,
  closeElectron,
  type LaunchResult,
} from './helpers/electronApp'
import { seedEditableDocument } from './helpers/seed'
import type { Client, Document } from '../../renderer/types'

/**
 * `/documents/new?base=<id>`（編集＝再発行、同一レコード UPDATE）と
 * `/documents/new?from=<id>`（複製＝新規作成）の E2E テスト。
 *
 * 変換ロジックは `renderer/components/documents/mapping.ts` の `toFormValues()`。
 * `renderer/pages/documents/new.tsx` が `base`/`from` クエリを解釈し、
 *   - base（編集）: 書類番号・発行日をそのまま維持して同じ id を UPDATE
 *   - from（複製）: 発行日を今日に、書類番号を新規採番して新規 INSERT
 * を行う。
 *
 * `/documents/new` は動的ルート（`[id].tsx`）ではなく通常の静的ページのため、
 * `document-create.spec.ts` と同様にクエリ付き URL へ直接 `page.goto` できる
 * （`/documents/{uuid}` のような動的ルートの SPA フォールバック回避策は不要）。
 */

let ctx: LaunchResult | undefined
let seededClient: Client | undefined
let seededDocument: Document | undefined

// Intl.NumberFormat ja-JP JPY の実出力（￥ or ¥ どちらも許容）。
// document-create.spec.ts と同じヘルパー。
const yen = (n: number): RegExp => {
  const formatted = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(n)
  const digits = formatted.replace(/^[^\d-]+/, '')
  return new RegExp(`[￥¥]\\s?${digits.replace(/,/g, ',')}`)
}

test.beforeAll(async () => {
  ctx = await launchElectron()
  await ctx.page.setViewportSize({ width: 1440, height: 900 })
  await ctx.page.waitForLoadState('networkidle')
  const seeded = await seedEditableDocument(ctx.page)
  seededClient = seeded.client
  seededDocument = seeded.document
})

test.afterAll(async () => {
  if (ctx) await closeElectron(ctx)
})

/**
 * E2E-DOC-EDIT-001: 編集モードの初期表示
 *
 * `/documents/new?base=<id>` を開き、見出し・書類番号・発行日・明細
 * （品目名/単価/数量/単位）・取引先がシード値どおり復元されていることを検証する。
 */
test('E2E-DOC-EDIT-001: 編集モードの初期表示', async () => {
  if (!ctx || !seededDocument || !seededClient) {
    throw new Error('Electron context not initialized')
  }
  const page = ctx.page
  const docId = seededDocument.id

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step(`/documents/new?base=${docId} に遷移`, async () => {
    await page.goto(`app://./documents/new?base=${docId}`)
    await page.waitForLoadState('networkidle')
  })

  await test.step('URL に ?base= が含まれる', async () => {
    expect(page.url()).toContain(`base=${docId}`)
  })

  await test.step('見出しが「書類編集（再発行）：請求書」', async () => {
    await expect(
      page.getByRole('heading', { level: 1, name: '書類編集（再発行）：請求書' })
    ).toBeVisible({ timeout: 15000 })
  })

  await test.step('書類番号がシード値「2026-01-999」で復元', async () => {
    await expect(page.locator('#documentNumber')).toHaveValue('2026-01-999')
  })

  await test.step('発行日がシード値「2026-01-15」で復元', async () => {
    await expect(page.locator('#issueDate')).toHaveValue('2026-01-15')
  })

  await test.step('取引先が「編集テスト株式会社 御中」で復元', async () => {
    await expect(page.locator('#clientId')).toHaveText('編集テスト株式会社 御中')
  })

  await test.step('明細（品目名/単価/数量/単位）がシード値で復元', async () => {
    await expect(page.locator('input[name="lines.0.content"]')).toHaveValue(
      '編集前品目'
    )
    await expect(page.locator('input[name="lines.0.unitPrice"]')).toHaveValue(
      '100000'
    )
    await expect(page.locator('input[name="lines.0.quantity"]')).toHaveValue(
      '2'
    )
    await expect(page.locator('input[name="lines.0.unit"]')).toHaveValue('個')
  })
})

/**
 * E2E-DOC-EDIT-002: 編集して更新
 *
 * 明細の単価を変更して「更新のみ保存」→ 同じ id の `/documents/{id}` に遷移し、
 * 詳細ページの金額が新しい値に反映されること、かつ書類の総件数が増えていない
 * こと（新規レコードが作られていない）を検証する。
 *
 * 新単価: 150,000 × 数量2 = 小計300,000 + 消費税10% 30,000 = 合計330,000
 */
test('E2E-DOC-EDIT-002: 編集して更新', async () => {
  if (!ctx || !seededDocument) throw new Error('Electron context not initialized')
  const page = ctx.page
  const docId = seededDocument.id

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const countDocuments = async (): Promise<number> => {
    return page.evaluate(async () => {
      type IpcBridge = {
        invoke<T>(channel: string, ...args: unknown[]): Promise<T>
      }
      const ipc = (window as unknown as { ipc: IpcBridge }).ipc
      const list = await ipc.invoke<unknown[]>('documents:list')
      return list.length
    })
  }

  let countBefore = 0

  await test.step(`/documents/new?base=${docId} に遷移`, async () => {
    await page.goto(`app://./documents/new?base=${docId}`)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { level: 1, name: '書類編集（再発行）：請求書' })
    ).toBeVisible({ timeout: 15000 })
    await expect(page.locator('input[name="lines.0.unitPrice"]')).toHaveValue(
      '100000'
    )
  })

  await test.step('更新前の書類総件数を取得', async () => {
    countBefore = await countDocuments()
    expect(countBefore).toBeGreaterThan(0)
  })

  await test.step('明細1行目の単価を150000に変更', async () => {
    const unitPriceInput = page.locator('input[name="lines.0.unitPrice"]')
    await unitPriceInput.fill('150000')
    await expect(unitPriceInput).toHaveValue('150000')
  })

  await test.step('「更新のみ保存」をクリック → /documents/{同じid} に遷移', async () => {
    const dialogMessages: string[] = []
    const onDialog = (d: import('@playwright/test').Dialog): void => {
      dialogMessages.push(d.message())
      void d.accept()
    }
    page.on('dialog', onDialog)

    await page.getByRole('button', { name: '更新のみ保存' }).click()

    await expect
      .poll(() => dialogMessages.length, { timeout: 30000 })
      .toBeGreaterThanOrEqual(1)
    expect(dialogMessages[0]).toMatch(/更新しました/)

    await expect(page).toHaveURL(new RegExp(`/documents/${docId}/?$`), {
      timeout: 15000,
    })
    await page.waitForLoadState('networkidle')

    page.off('dialog', onDialog)
  })

  await test.step('詳細ページの合計金額が新しい値（￥330,000）', async () => {
    const infoCard = page
      .locator('div')
      .filter({ has: page.getByText('書類情報', { exact: true }) })
      .first()
    await expect(infoCard).toBeVisible({ timeout: 15000 })
    await expect(
      infoCard
        .locator('span.text-base.font-semibold')
        .filter({ hasText: yen(330000) })
        .first()
    ).toBeVisible()
  })

  await test.step('書類の総件数が更新前と変わらない（新規レコードが作られていない）', async () => {
    const countAfter = await countDocuments()
    expect(countAfter).toBe(countBefore)
  })
})

/**
 * E2E-DOC-EDIT-003: 書類番号が維持されること
 *
 * EDIT-002 の更新後も、書類番号がシード時と同一（`2026-01-999`）であることを
 * 詳細ページと `documents:get` IPC の両方で検証する。
 */
test('E2E-DOC-EDIT-003: 書類番号が維持されること', async () => {
  if (!ctx || !seededDocument) throw new Error('Electron context not initialized')
  const page = ctx.page
  const docId = seededDocument.id

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  await test.step('一覧を hydrate してから router.push で詳細ページへ', async () => {
    await page.goto('app://./documents/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('tbody > tr').first()).toBeVisible({
      timeout: 15000,
    })
    await page.evaluate((id) => {
      type NextWindow = Window & {
        next?: { router?: { push: (url: string) => Promise<boolean> } }
      }
      const w = window as NextWindow
      return w.next?.router?.push(`/documents/${id}`)
    }, docId)
    await expect(page).toHaveURL(new RegExp(`/documents/${docId}/?$`), {
      timeout: 10000,
    })
    await page.waitForLoadState('networkidle')
  })

  await test.step('詳細ページの書類番号が「2026-01-999」のまま', async () => {
    await expect(
      page.locator('span.font-mono').filter({ hasText: '2026-01-999' }).first()
    ).toBeVisible({ timeout: 15000 })
  })

  await test.step('documents:get IPC でも documentNumber が「2026-01-999」', async () => {
    const doc = await page.evaluate(async (id) => {
      type IpcBridge = {
        invoke<T>(channel: string, ...args: unknown[]): Promise<T>
      }
      const ipc = (window as unknown as { ipc: IpcBridge }).ipc
      return ipc.invoke<{ documentNumber: string } | null>('documents:get', id)
    }, docId)
    expect(doc?.documentNumber).toBe('2026-01-999')
  })
})

/**
 * E2E-DOC-EDIT-004: 複製モード
 *
 * EDIT-002/003 の編集フローと独立させるため、複製専用の書類を新規にシードする。
 * `/documents/new?from=<id>` を開き、明細は復元されるが発行日は今日、
 * 書類番号はシード元と異なる新しい番号（空でない）になることを検証する。
 */
test('E2E-DOC-EDIT-004: 複製モード', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const { document: sourceDoc } = await seedEditableDocument(page)
  const sourceId = sourceDoc.id

  await test.step(`/documents/new?from=${sourceId} に遷移`, async () => {
    await page.goto(`app://./documents/new?from=${sourceId}`)
    await page.waitForLoadState('networkidle')
  })

  await test.step('URL に ?from= が含まれる', async () => {
    expect(page.url()).toContain(`from=${sourceId}`)
  })

  await test.step('明細（品目名/単価/数量/単位）がシード値で復元', async () => {
    await expect(page.locator('input[name="lines.0.content"]')).toHaveValue(
      '編集前品目',
      { timeout: 15000 }
    )
    await expect(page.locator('input[name="lines.0.unitPrice"]')).toHaveValue(
      '100000'
    )
    await expect(page.locator('input[name="lines.0.quantity"]')).toHaveValue(
      '2'
    )
    await expect(page.locator('input[name="lines.0.unit"]')).toHaveValue('個')
  })

  await test.step('発行日が今日の日付になっている（シード元の 2026-01-15 ではない）', async () => {
    const today = new Date().toISOString().slice(0, 10)
    await expect(page.locator('#issueDate')).toHaveValue(today)
  })

  await test.step('書類番号がシード元と異なる新しい番号で、空欄でない', async () => {
    const numberInput = page.locator('#documentNumber')
    await expect
      .poll(async () => (await numberInput.inputValue()).trim(), {
        timeout: 10000,
      })
      .not.toBe('')
    const newNumber = (await numberInput.inputValue()).trim()
    expect(newNumber).not.toBe('')
    expect(newNumber).not.toBe('2026-01-999')
  })
})

/**
 * E2E-DOC-EDIT-005: 存在しないIDを指定
 *
 * `/documents/new?base=<存在しないUUID>` を開くと「書類が見つかりません」が
 * 表示されることを検証する。`/documents/new` は動的ルートではなく静的ページの
 * ため、クエリ付き URL へ直接 `page.goto` で到達できる。
 */
test('E2E-DOC-EDIT-005: 存在しないIDを指定', async () => {
  if (!ctx) throw new Error('Electron context not initialized')
  const page = ctx.page

  const consoleLogs: { type: string; text: string }[] = []
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() })
  })

  const nonExistentId = '00000000-0000-0000-0000-000000000000'

  await test.step(`/documents/new?base=${nonExistentId} に遷移`, async () => {
    await page.goto(`app://./documents/new?base=${nonExistentId}`)
    await page.waitForLoadState('networkidle')
  })

  await test.step('「書類が見つかりません」が表示される', async () => {
    await expect(
      page.getByText('書類が見つかりません', { exact: true }).first()
    ).toBeVisible({ timeout: 15000 })
  })

  await test.step('未登録IDが説明文に含まれる', async () => {
    await expect(
      page.getByText(nonExistentId, { exact: false }).first()
    ).toBeVisible()
  })
})
