import {
  API_PATHS,
  Document,
  DocumentDraft,
  DocumentFilter,
  DocumentLine,
  DocumentSort,
  DocumentType,
  DocumentWithLines,
  MonthlySummary,
  NextDocumentNumber,
} from '../../types'

/**
 * @API_INTEGRATION
 * IPC: documents:list (API_PATHS.documents.list)
 * リクエスト: なし
 * レスポンス: Document[]（全件）
 */
export async function listDocuments(): Promise<Document[]> {
  void API_PATHS.documents.list
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:list-recent (API_PATHS.documents.listRecent)
 * リクエスト: limit（取得件数）
 * レスポンス: Document[]
 */
export async function listRecentDocuments(limit: number): Promise<Document[]> {
  void limit
  void API_PATHS.documents.listRecent
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:search (API_PATHS.documents.search)
 * リクエスト: filter（検索条件）、sort（ソート条件、省略可）
 * レスポンス: Document[]（条件に合致した書類）
 */
export async function searchDocuments(
  filter: DocumentFilter,
  sort?: DocumentSort
): Promise<Document[]> {
  void filter
  void sort
  void API_PATHS.documents.search
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:monthly-summary (API_PATHS.documents.monthlySummary)
 * リクエスト: yearMonth（"YYYY-MM" 形式）
 * レスポンス: MonthlySummary
 */
export async function getMonthlySummary(yearMonth: string): Promise<MonthlySummary> {
  void yearMonth
  void API_PATHS.documents.monthlySummary
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:get:${id} (API_PATHS.documents.get)
 * リクエスト: id（書類ID）
 * レスポンス: Document（ヘッダ情報）
 */
export async function getDocument(id: string): Promise<Document> {
  void API_PATHS.documents.get(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:lines:${documentId} (API_PATHS.documents.lines)
 * リクエスト: documentId（親書類ID）
 * レスポンス: DocumentLine[]（lineNumber 昇順）
 */
export async function listDocumentLines(
  documentId: string
): Promise<DocumentLine[]> {
  void API_PATHS.documents.lines(documentId)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:get + documents:lines（合成）
 * リクエスト: id（書類ID）
 * レスポンス: DocumentWithLines（ヘッダ + 明細）
 */
export async function getDocumentWithLines(
  id: string
): Promise<DocumentWithLines> {
  void API_PATHS.documents.get(id)
  void API_PATHS.documents.lines(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:create (API_PATHS.documents.create)
 * リクエスト: DocumentDraft（フォーム入力）
 * レスポンス: Document（採番・計算済みの確定レコード）
 */
export async function createDocument(input: DocumentDraft): Promise<Document> {
  void input
  void API_PATHS.documents.create
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:generate-pdf:${id} (API_PATHS.documents.generatePdf)
 * リクエスト: id（書類ID）
 * レスポンス: { pdfFilePath: string }（保存先パス）
 */
export async function generateDocumentPdf(
  id: string
): Promise<{ pdfFilePath: string }> {
  void API_PATHS.documents.generatePdf(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:next-number:${type} (API_PATHS.documents.nextNumber)
 * リクエスト: type（書類種別）
 * レスポンス: NextDocumentNumber（次の採番結果）
 */
export async function getNextDocumentNumber(
  type: DocumentType
): Promise<NextDocumentNumber> {
  void API_PATHS.documents.nextNumber(type)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:duplicate:${id} (API_PATHS.documents.duplicate)
 * リクエスト: id（複製元の書類ID）
 * レスポンス: Document（複製後の新しい書類）
 */
export async function duplicateDocument(id: string): Promise<Document> {
  void API_PATHS.documents.duplicate(id)
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: documents:delete:${id} (API_PATHS.documents.delete)
 * リクエスト: id（削除する書類ID）
 * レスポンス: void
 */
export async function deleteDocument(id: string): Promise<void> {
  void API_PATHS.documents.delete(id)
  throw new Error('API not implemented')
}
