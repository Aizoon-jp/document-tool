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

export async function listDocuments(
  sort?: DocumentSort
): Promise<Document[]> {
  return window.ipc.invoke<Document[]>(API_PATHS.documents.list, sort)
}

export async function listRecentDocuments(limit = 5): Promise<Document[]> {
  return window.ipc.invoke<Document[]>(API_PATHS.documents.listRecent, limit)
}

export async function searchDocuments(
  filter: DocumentFilter,
  sort?: DocumentSort
): Promise<Document[]> {
  return window.ipc.invoke<Document[]>(
    API_PATHS.documents.search,
    filter,
    sort
  )
}

export async function getMonthlySummary(
  yearMonth: string
): Promise<MonthlySummary> {
  return window.ipc.invoke<MonthlySummary>(
    API_PATHS.documents.monthlySummary,
    yearMonth
  )
}

export async function getDocument(id: string): Promise<Document | null> {
  return window.ipc.invoke<Document | null>(API_PATHS.documents.get, id)
}

export async function listDocumentLines(
  documentId: string
): Promise<DocumentLine[]> {
  return window.ipc.invoke<DocumentLine[]>(
    API_PATHS.documents.lines,
    documentId
  )
}

export async function getDocumentWithLines(
  id: string
): Promise<DocumentWithLines | null> {
  const doc = await getDocument(id)
  if (!doc) return null
  const lines = await listDocumentLines(id)
  return { ...doc, lines }
}

export async function createDocument(draft: DocumentDraft): Promise<Document> {
  return window.ipc.invoke<Document>(API_PATHS.documents.create, draft)
}

export async function updateDocument(
  id: string,
  draft: DocumentDraft
): Promise<Document> {
  return window.ipc.invoke<Document>(API_PATHS.documents.update, id, draft)
}

export async function generateDocumentPdf(
  id: string
): Promise<{ filePath: string }> {
  return window.ipc.invoke<{ filePath: string }>(
    API_PATHS.documents.generatePdf,
    id
  )
}

export async function getNextDocumentNumber(
  type: DocumentType
): Promise<NextDocumentNumber> {
  return window.ipc.invoke<NextDocumentNumber>(
    API_PATHS.documents.nextNumber,
    type
  )
}

export async function duplicateDocument(id: string): Promise<Document> {
  return window.ipc.invoke<Document>(API_PATHS.documents.duplicate, id)
}

export async function deleteDocument(id: string): Promise<void> {
  await window.ipc.invoke<void>(API_PATHS.documents.delete, id)
}
