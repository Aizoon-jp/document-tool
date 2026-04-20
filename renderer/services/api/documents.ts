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

export async function listDocuments(): Promise<Document[]> {
  void API_PATHS.documents.list
  throw new Error('API not implemented')
}

export async function listRecentDocuments(limit: number): Promise<Document[]> {
  void limit
  void API_PATHS.documents.listRecent
  throw new Error('API not implemented')
}

export async function searchDocuments(
  filter: DocumentFilter,
  sort?: DocumentSort
): Promise<Document[]> {
  void filter
  void sort
  void API_PATHS.documents.search
  throw new Error('API not implemented')
}

export async function getMonthlySummary(
  yearMonth: string
): Promise<MonthlySummary> {
  void yearMonth
  void API_PATHS.documents.monthlySummary
  throw new Error('API not implemented')
}

export async function getDocument(id: string): Promise<Document> {
  void id
  void API_PATHS.documents.get
  throw new Error('API not implemented')
}

export async function listDocumentLines(
  documentId: string
): Promise<DocumentLine[]> {
  void documentId
  void API_PATHS.documents.lines
  throw new Error('API not implemented')
}

export async function getDocumentWithLines(
  id: string
): Promise<DocumentWithLines> {
  void id
  void API_PATHS.documents.get
  void API_PATHS.documents.lines
  throw new Error('API not implemented')
}

export async function createDocument(input: DocumentDraft): Promise<Document> {
  void input
  void API_PATHS.documents.create
  throw new Error('API not implemented')
}

export async function generateDocumentPdf(
  id: string
): Promise<{ pdfFilePath: string }> {
  void id
  void API_PATHS.documents.generatePdf
  throw new Error('API not implemented')
}

export async function getNextDocumentNumber(
  type: DocumentType
): Promise<NextDocumentNumber> {
  void type
  void API_PATHS.documents.nextNumber
  throw new Error('API not implemented')
}

export async function duplicateDocument(id: string): Promise<Document> {
  void id
  void API_PATHS.documents.duplicate
  throw new Error('API not implemented')
}

export async function deleteDocument(id: string): Promise<void> {
  void id
  void API_PATHS.documents.delete
  throw new Error('API not implemented')
}
