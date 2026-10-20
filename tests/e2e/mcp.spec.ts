import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { closeElectron, launchElectron, type LaunchResult } from './helpers/electronApp'

/**
 * `--mcp` モード: 実行ファイルを GUI なしの stdio MCP サーバーとして起動し、
 * 書類作成からPDF生成までを MCP クライアント経由で行う。
 * 画面（GUI）を開いたままでも同じDBで動くことを確かめるため、GUI も同じデータフォルダで起動する。
 */

const projectRoot = path.resolve(__dirname, '..', '..')
const electronBinary = require('electron') as unknown as string
// CI ではインストーラーと同じ実行ファイル（パスに日本語を含む）を直接起動して確かめる
const packagedExe = process.env.JIMU_E2E_MCP_EXE

let gui: LaunchResult
let transport: StdioClientTransport
let client: Client

interface ToolResult {
  isError?: boolean
  content: { type: string; text: string }[]
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = (await client.callTool({ name, arguments: args })) as ToolResult
  return { isError: res.isError === true, json: () => JSON.parse(res.content[0].text) }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

test.describe('MCP モード', () => {
  test.beforeAll(async () => {
    gui = await launchElectron()
    await gui.page.waitForFunction(() => typeof (window as unknown as { ipc?: unknown }).ipc !== 'undefined')
    // PDF には会社情報が必須。MCP には会社を登録するツールが無いため GUI 側の IPC で入れる
    await gui.page.evaluate(async () => {
      const ipc = (window as unknown as { ipc: { invoke(c: string, ...a: unknown[]): Promise<unknown> } }).ipc
      await ipc.invoke('company:update', {
        name: 'テスト株式会社',
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
    })

    transport = new StdioClientTransport({
      command: packagedExe ?? electronBinary,
      args: [
        ...(packagedExe ? [] : [projectRoot]),
        '--mcp',
        `--user-data-dir=${gui.userDataDir}`,
        '--no-sandbox',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
      cwd: projectRoot,
      env: {
        ...(process.env as Record<string, string>),
        NODE_ENV: 'production',
        ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        JIMU_PDF_OUTPUT_DIR: path.join(gui.userDataDir, 'pdf'),
      },
      stderr: 'pipe',
    })
    transport.stderr?.on('data', (d) => process.stderr.write(`[mcp stderr] ${d}`))
    client = new Client({ name: 'e2e', version: '0' })
    // 接続できること自体が「stdout に JSON-RPC 以外が混ざっていない」ことの担保になる
    await client.connect(transport)
  })

  test.afterAll(async () => {
    const pid = transport?.pid
    await client?.close().catch(() => undefined)
    if (pid) {
      await expect.poll(() => isAlive(pid), { timeout: 15000 }).toBe(false)
    }
    if (gui) await closeElectron(gui)
  })

  test('ツール一覧と instructions が取れる', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name)).toContain('create_document')
    expect(tools.map((t) => t.name)).not.toContain('delete_document')
    expect(client.getInstructions()).toContain('税抜単価')
  })

  test('取引先登録 → 書類作成 → PDF生成 → 検索で見つかる', async () => {
    const created = await call('create_client', { name: 'MCP商事株式会社' })
    expect(created.isError).toBe(false)
    const clientId = created.json().id

    const doc = await call('create_document', {
      documentType: 'invoice',
      clientId,
      issueDate: '2026-04-20',
      lines: [{ content: 'AI連携テスト', quantity: 1, unitPrice: 100000 }],
      remarks: 'MCP経由で作成',
    })
    expect(doc.isError).toBe(false)
    const result = doc.json()
    expect(result.pdfError).toBeUndefined()
    expect(result.document.totalAmount).toBe(110000)

    const pdfPath: string = result.pdfFilePath
    expect(pdfPath.startsWith(path.join(gui.userDataDir, 'pdf'))).toBe(true)
    expect(fs.existsSync(pdfPath)).toBe(true)
    expect(fs.readFileSync(pdfPath).subarray(0, 4).toString()).toBe('%PDF')

    const found = (await call('search_documents', { clientName: 'MCP商事' })).json()
    expect(found.total).toBe(1)
    expect(found.documents[0].documentNumber).toBe(result.document.documentNumber)
  })

  test('GUI から見ても MCP で作った書類が同じDBにある', async () => {
    const docs = await gui.page.evaluate(async () => {
      const ipc = (window as unknown as { ipc: { invoke<T>(c: string, ...a: unknown[]): Promise<T> } }).ipc
      return ipc.invoke<{ clientName: string }[]>('documents:list')
    })
    expect(docs.map((d) => d.clientName)).toContain('MCP商事株式会社')
  })
})
