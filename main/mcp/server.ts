import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { ZodRawShape } from 'zod'
import {
  calculateInputShape,
  clientInputSchema,
  createDocumentShape,
  idShape,
  searchDocumentsShape,
  updateDocumentShape,
} from './schemas'
import { createTools, type McpDeps } from './tools'

const SERVER_INSTRUCTIONS = `事務ツール（請求書・見積書などの書類作成アプリ）を操作するサーバーです。
- 金額は必ず「税抜単価」で渡す。消費税は税率ごとに税抜額を合計してから1回だけ四捨五入するため、行を増やすと税込合計が1円ずれることがある。税込で狙った合計にしたい時は、発行前に calculate_totals で合計を確認する。
- 書類番号（documentNumber）は原則指定せず、自動採番に任せる。
- 取引先が見つからない時は、create_client する前に必ず利用者に確認する。
- 書類の作成・更新後は、PDFのパス（pdfFilePath）を利用者に伝える。
- 削除・設定変更・角印の登録はできない。`

function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data ?? null, null, 2) }] }
}

function fail(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error)
  return { content: [{ type: 'text', text: `エラー: ${message}` }], isError: true }
}

export function createMcpServer(deps: McpDeps, version: string): McpServer {
  const server = new McpServer({ name: 'jimu-tool', version }, { instructions: SERVER_INSTRUCTIONS })
  const tools = createTools(deps)
  // registerTool のジェネリクスは zod の型と組み合わさると型推論が深くなりすぎるため、
  // 実際に使う形だけの型に絞る（入力検証は SDK が inputSchema で行う）
  const registerTool = server.registerTool.bind(server) as unknown as (
    name: string,
    config: { description: string; inputSchema: ZodRawShape },
    cb: (args: unknown) => Promise<CallToolResult>
  ) => void

  // ハンドラの例外は isError の結果にする（例外でプロセスや接続を落とさない）
  const register = (
    name: string,
    description: string,
    inputSchema: ZodRawShape,
    handler: (args: never) => Promise<unknown>
  ): void => {
    registerTool(name, { description, inputSchema }, async (args) => {
      try {
        return ok(await handler(args as never))
      } catch (e) {
        return fail(e)
      }
    })
  }

  register('get_company', '自社（発行者）の会社情報と振込先を取得する。書類の発行元に表示される内容。', {}, () =>
    tools.getCompany()
  )

  register('list_clients', '取引先の一覧を取得する。書類作成に必要な clientId はここで調べる。', {}, () =>
    tools.listClients()
  )

  register(
    'create_client',
    '取引先を新規登録する。同名の取引先が既にないか list_clients で確認し、新規登録してよいか利用者に確認してから使う。',
    clientInputSchema.shape,
    (args: Parameters<typeof tools.createClient>[0]) => tools.createClient(args)
  )

  register('list_items', '登録済みの品目マスタ（品名・税抜単価・単位・税率）を取得する。明細行の参考にする。', {}, () =>
    tools.listItems()
  )

  register(
    'list_stamps',
    '登録済みの角印の一覧（id・名前・既定かどうか）を取得する。画像は返さない。',
    {},
    () => tools.listStamps()
  )

  register(
    'search_documents',
    '発行済みの書類を検索し、番号・種別・発行日・取引先名・金額などの要約を返す。条件はすべて任意。最大100件。',
    searchDocumentsShape,
    (args: Parameters<typeof tools.searchDocuments>[0]) => tools.searchDocuments(args)
  )

  register('get_document', '書類1件の詳細（金額・オプション・全明細行）を取得する。', idShape, (args: { id: string }) =>
    tools.getDocument(args.id)
  )

  register(
    'calculate_totals',
    '書類を保存せずに、小計・消費税・合計・税率別内訳・各行の金額を計算して返す。' +
      'create_document の前に金額を確認するために使う。',
    calculateInputShape,
    (args: Parameters<typeof tools.calculateTotals>[0]) => tools.calculateTotals(args)
  )

  register(
    'create_document',
    '書類（請求書・見積書など）を新規作成して保存し、既定でPDFも生成する。' +
      '単価は税抜で渡す。書類番号は省略すると自動採番。' +
      '戻り値の pdfFilePath を利用者に伝える。PDF生成に失敗しても書類は保存済み（pdfError に理由）なので、再作成せず generate_pdf を使う。',
    createDocumentShape,
    (args: Parameters<typeof tools.createDocument>[0]) => tools.createDocument(args)
  )

  register(
    'update_document',
    '既存の書類を更新する。変更したい項目だけ渡せばよく、省略した項目は現在の値のまま。' +
      'lines を渡すと明細は全行置き換わる。既定でPDFを再生成する。',
    updateDocumentShape,
    (args: Parameters<typeof tools.updateDocument>[0]) => tools.updateDocument(args)
  )

  register(
    'generate_pdf',
    '保存済みの書類のPDFを（再）生成し、ファイルパスを返す。',
    idShape,
    (args: { id: string }) => tools.generatePdf(args.id)
  )

  return server
}
