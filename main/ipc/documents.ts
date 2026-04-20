import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import type {
  DetailMode,
  Document,
  DocumentDraft,
  DocumentFilter,
  DocumentLine,
  DocumentSort,
  DocumentType,
  MonthlySummary,
  TaxRate,
} from '../../renderer/types'
import { getDatabase, schema } from '../db/client'
import { generateId } from '../helpers/id'
import { deserializeOptions, nowIso, serializeOptions } from '../helpers/serialize'
import { calculateTotals } from './documentsCalc'
import { getNextDocumentNumber } from './documentsNumber'

type DocRow = typeof schema.documents.$inferSelect
type LineRow = typeof schema.documentLines.$inferSelect

function toDocument(row: DocRow, clientName: string): Document {
  return {
    id: row.id,
    documentType: row.documentType as DocumentType,
    documentNumber: row.documentNumber,
    issueDate: row.issueDate,
    clientId: row.clientId,
    clientName,
    subtotal: row.subtotal,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    withholdingTax: row.withholdingTax,
    options: deserializeOptions(row.options),
    stampId: row.stampId,
    detailMode: row.detailMode as DetailMode,
    remarks: row.remarks,
    pdfFilePath: row.pdfFilePath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toLine(row: LineRow): DocumentLine {
  return {
    id: row.id,
    documentId: row.documentId,
    lineNumber: row.lineNumber,
    content: row.content,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    taxRate: row.taxRate as TaxRate,
    isReducedTaxRate: row.isReducedTaxRate,
    subtotalExclTax: row.subtotalExclTax,
    subtotalInclTax: row.subtotalInclTax,
  }
}

async function fetchClientNames(
  clientIds: string[]
): Promise<Map<string, string>> {
  if (clientIds.length === 0) return new Map()
  const db = getDatabase()
  const rows = await db
    .select({ id: schema.clients.id, name: schema.clients.name })
    .from(schema.clients)
    .where(inArray(schema.clients.id, clientIds))
  return new Map(rows.map((r) => [r.id, r.name]))
}

function sortClause(sort: DocumentSort | undefined) {
  const key = sort?.key ?? 'issueDate'
  const direction = sort?.direction ?? 'desc'
  const col =
    key === 'issueDate'
      ? schema.documents.issueDate
      : key === 'totalAmount'
        ? schema.documents.totalAmount
        : schema.documents.documentNumber
  return direction === 'asc' ? asc(col) : desc(col)
}

async function attachClientNames(rows: DocRow[]): Promise<Document[]> {
  const names = await fetchClientNames(rows.map((r) => r.clientId))
  return rows.map((row) => toDocument(row, names.get(row.clientId) ?? ''))
}

export async function listDocuments(
  sort?: DocumentSort
): Promise<Document[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.documents)
    .orderBy(sortClause(sort))
  return attachClientNames(rows)
}

export async function listRecentDocuments(limit = 5): Promise<Document[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.documents)
    .orderBy(desc(schema.documents.issueDate), desc(schema.documents.createdAt))
    .limit(limit)
  return attachClientNames(rows)
}

export async function searchDocuments(
  filter: DocumentFilter,
  sort?: DocumentSort
): Promise<Document[]> {
  const db = getDatabase()
  const conditions = []
  if (filter.documentType && filter.documentType !== 'all') {
    conditions.push(eq(schema.documents.documentType, filter.documentType))
  }
  if (filter.startDate) {
    conditions.push(gte(schema.documents.issueDate, filter.startDate))
  }
  if (filter.endDate) {
    conditions.push(lte(schema.documents.issueDate, filter.endDate))
  }
  if (filter.minAmount !== undefined) {
    conditions.push(gte(schema.documents.totalAmount, filter.minAmount))
  }
  if (filter.maxAmount !== undefined) {
    conditions.push(lte(schema.documents.totalAmount, filter.maxAmount))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const rows = where
    ? await db.select().from(schema.documents).where(where).orderBy(sortClause(sort))
    : await db.select().from(schema.documents).orderBy(sortClause(sort))

  const docs = await attachClientNames(rows)
  if (filter.clientName) {
    const q = filter.clientName
    return docs.filter((d) => d.clientName.includes(q))
  }
  return docs
}

export async function getMonthlySummary(
  yearMonth: string
): Promise<MonthlySummary> {
  const db = getDatabase()
  const start = `${yearMonth}-01`
  const end = `${yearMonth}-31`
  const rows = await db
    .select({
      documentType: schema.documents.documentType,
      count: sql<number>`count(*)`,
    })
    .from(schema.documents)
    .where(
      and(
        gte(schema.documents.issueDate, start),
        lte(schema.documents.issueDate, end)
      )
    )
    .groupBy(schema.documents.documentType)

  const breakdown: Record<DocumentType, number> = {
    invoice: 0,
    receipt: 0,
    quote: 0,
    payment_request: 0,
    delivery_note: 0,
  }
  let totalCount = 0
  for (const row of rows) {
    const type = row.documentType as DocumentType
    breakdown[type] = Number(row.count)
    totalCount += Number(row.count)
  }
  return { yearMonth, totalCount, breakdown }
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1)
  if (rows.length === 0) return null
  const names = await fetchClientNames([rows[0].clientId])
  return toDocument(rows[0], names.get(rows[0].clientId) ?? '')
}

export async function getDocumentLines(
  documentId: string
): Promise<DocumentLine[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.documentLines)
    .where(eq(schema.documentLines.documentId, documentId))
    .orderBy(asc(schema.documentLines.lineNumber))
  return rows.map(toLine)
}

export async function createDocument(draft: DocumentDraft): Promise<Document> {
  const db = getDatabase()
  const totals = calculateTotals(draft)
  const id = generateId()
  const now = nowIso()

  const stampId = draft.stampIds.length > 0 ? draft.stampIds[0] : null

  const inserted = db.transaction((tx) => {
    const doc = tx
      .insert(schema.documents)
      .values({
        id,
        documentType: draft.documentType,
        documentNumber: draft.documentNumber,
        issueDate: draft.issueDate,
        clientId: draft.clientId,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        withholdingTax: totals.withholdingTax,
        options: serializeOptions(draft.options),
        stampId,
        detailMode: draft.detailMode,
        remarks: draft.remarks || null,
        pdfFilePath: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .all()

    if (totals.lines.length > 0) {
      tx.insert(schema.documentLines)
        .values(
          totals.lines.map((l) => ({
            id: generateId(),
            documentId: id,
            lineNumber: l.lineNumber,
            content: l.content,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            isReducedTaxRate: l.isReducedTaxRate,
            subtotalExclTax: l.subtotalExclTax,
            subtotalInclTax: l.subtotalInclTax,
          }))
        )
        .run()
    }
    return doc[0]
  })

  const names = await fetchClientNames([inserted.clientId])
  return toDocument(inserted, names.get(inserted.clientId) ?? '')
}

export async function updateDocument(
  id: string,
  draft: DocumentDraft
): Promise<Document> {
  const db = getDatabase()
  const totals = calculateTotals(draft)
  const now = nowIso()
  const stampId = draft.stampIds.length > 0 ? draft.stampIds[0] : null

  const updated = db.transaction((tx) => {
    const existing = tx
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .all()
    if (existing.length === 0) {
      throw new Error(`Document not found: ${id}`)
    }

    const updatedRows = tx
      .update(schema.documents)
      .set({
        documentType: draft.documentType,
        documentNumber: draft.documentNumber,
        issueDate: draft.issueDate,
        clientId: draft.clientId,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        withholdingTax: totals.withholdingTax,
        options: serializeOptions(draft.options),
        stampId,
        detailMode: draft.detailMode,
        remarks: draft.remarks || null,
        updatedAt: now,
      })
      .where(eq(schema.documents.id, id))
      .returning()
      .all()

    tx.delete(schema.documentLines)
      .where(eq(schema.documentLines.documentId, id))
      .run()

    if (totals.lines.length > 0) {
      tx.insert(schema.documentLines)
        .values(
          totals.lines.map((l) => ({
            id: generateId(),
            documentId: id,
            lineNumber: l.lineNumber,
            content: l.content,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            isReducedTaxRate: l.isReducedTaxRate,
            subtotalExclTax: l.subtotalExclTax,
            subtotalInclTax: l.subtotalInclTax,
          }))
        )
        .run()
    }
    return updatedRows[0]
  })

  const names = await fetchClientNames([updated.clientId])
  return toDocument(updated, names.get(updated.clientId) ?? '')
}

export async function deleteDocument(id: string): Promise<void> {
  const db = getDatabase()
  await db.delete(schema.documents).where(eq(schema.documents.id, id))
}

export async function duplicateDocument(id: string): Promise<Document> {
  const db = getDatabase()
  const source = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1)
  if (source.length === 0) {
    throw new Error(`Document not found: ${id}`)
  }
  const srcLines = await db
    .select()
    .from(schema.documentLines)
    .where(eq(schema.documentLines.documentId, id))

  const next = await getNextDocumentNumber(source[0].documentType as DocumentType)
  const today = new Date().toISOString().slice(0, 10)

  const draft: DocumentDraft = {
    documentType: source[0].documentType as DocumentType,
    documentNumber: next.formatted,
    issueDate: today,
    clientId: source[0].clientId,
    detailMode: source[0].detailMode as DetailMode,
    lines: srcLines.map((l) => ({
      itemId: null,
      content: l.content,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate as TaxRate,
      isReducedTaxRate: l.isReducedTaxRate,
    })),
    externalAmount: source[0].detailMode === 'external' ? source[0].subtotal : 0,
    options: deserializeOptions(source[0].options),
    stampIds: source[0].stampId ? [source[0].stampId] : [],
    remarks: source[0].remarks ?? '',
  }
  return createDocument(draft)
}
