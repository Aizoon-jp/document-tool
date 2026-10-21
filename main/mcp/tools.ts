import type { Document, DocumentLine, DocumentType } from '../../renderer/types'
import { getCompany } from '../ipc/company'
import { createClient, getClient, listClients } from '../ipc/clients'
import { calculateTotals } from '../ipc/documentsCalc'
import { getNextDocumentNumber } from '../ipc/documentsNumber'
import {
  createDocument,
  getDocument,
  getDocumentLines,
  searchDocuments,
  updateDocument,
} from '../ipc/documents'
import { listItems } from '../ipc/items'
import { getStamp, listStamps } from '../ipc/stamps'
import {
  buildCalculationDraft,
  defaultOptionsFor,
  mergeExistingDraft,
  mergeOptions,
  resolveStampIds,
  toLineInputs,
} from './documentDraft'
import type { ClientToolInput, LineInput, OptionsInput } from './schemas'

/** search_documents が一度に返す上限。AIの文脈を溢れさせないため */
const SEARCH_LIMIT = 100

export interface McpDeps {
  generatePdf: (documentId: string) => Promise<{ filePath: string }>
}

interface DocumentBody {
  documentType: DocumentType
  clientId: string
  issueDate: string
  documentNumber?: string
  lines: LineInput[]
  remarks?: string
  options?: OptionsInput
  stampIds?: string[]
  generatePdf: boolean
}

type DocumentPatch = Partial<Omit<DocumentBody, 'generatePdf'>> & {
  id: string
  generatePdf: boolean
}

async function requireDocument(id: string): Promise<{ doc: Document; lines: DocumentLine[] }> {
  const doc = await getDocument(id)
  if (!doc) throw new Error(`書類が見つかりません: ${id}`)
  return { doc, lines: await getDocumentLines(id) }
}

async function assertClientExists(clientId: string): Promise<void> {
  if (!(await getClient(clientId))) {
    throw new Error(`取引先が見つかりません: ${clientId}（list_clients で確認してください）`)
  }
}

async function assertStampsExist(stampIds: string[]): Promise<void> {
  for (const id of stampIds) {
    if (!(await getStamp(id))) {
      throw new Error(`角印が見つかりません: ${id}（list_stamps で確認してください）`)
    }
  }
}

/** 保存済みの書類にPDFを付ける。PDFの失敗で保存済みの書類を失敗扱いにしない */
async function withPdf(deps: McpDeps, id: string, generate: boolean) {
  let pdfError: string | undefined
  if (generate) {
    try {
      await deps.generatePdf(id)
    } catch (e) {
      pdfError = `PDFの生成に失敗しました。generate_pdf で再試行してください: ${(e as Error).message}`
    }
  }
  const { doc, lines } = await requireDocument(id)
  return { document: doc, lines, pdfFilePath: doc.pdfFilePath, ...(pdfError && { pdfError }) }
}

export function createTools(deps: McpDeps) {
  return {
    getCompany: () => getCompany(),

    listClients: () => listClients(),

    createClient: (input: ClientToolInput) =>
      createClient({
        name: input.name,
        honorific: input.honorific,
        postalCode: input.postalCode ?? null,
        address: input.address ?? null,
        tel: input.tel ?? null,
        contactPerson: input.contactPerson ?? null,
        contactDepartment: input.contactDepartment ?? null,
        paymentTerms: input.paymentTerms ?? null,
        defaultTaxCategory: input.defaultTaxCategory,
        numberPrefix: input.numberPrefix ?? null,
        notes: input.notes ?? null,
      }),

    listItems: () => listItems(),

    // 画像パスは返さない（AIには不要で、ファイルの所在を漏らすだけになる）
    listStamps: async () =>
      (await listStamps()).map((s) => ({ id: s.id, name: s.name, isDefault: s.isDefault })),

    searchDocuments: async (filter: {
      clientName?: string
      startDate?: string
      endDate?: string
      documentType?: DocumentType
    }) => {
      const docs = await searchDocuments(filter)
      return {
        total: docs.length,
        truncated: docs.length > SEARCH_LIMIT,
        documents: docs.slice(0, SEARCH_LIMIT).map((d) => ({
          id: d.id,
          documentNumber: d.documentNumber,
          documentType: d.documentType,
          issueDate: d.issueDate,
          clientName: d.clientName,
          subtotal: d.subtotal,
          taxAmount: d.taxAmount,
          totalAmount: d.totalAmount,
          pdfFilePath: d.pdfFilePath,
        })),
      }
    },

    getDocument: async (id: string) => {
      const { doc, lines } = await requireDocument(id)
      return { document: doc, lines }
    },

    calculateTotals: async (input: {
      documentType: DocumentType
      lines: LineInput[]
      options?: OptionsInput
    }) => {
      const totals = calculateTotals(
        await buildCalculationDraft(input.documentType, input.lines, input.options)
      )
      return {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        withholdingTax: totals.withholdingTax,
        taxBreakdown: totals.taxBreakdown,
        lines: totals.lines.map((l) => ({
          lineNumber: l.lineNumber,
          content: l.content,
          subtotalExclTax: l.subtotalExclTax,
          subtotalInclTaxReference: l.subtotalInclTax,
        })),
      }
    },

    createDocument: async (input: DocumentBody) => {
      await assertClientExists(input.clientId)
      if (input.stampIds) await assertStampsExist(input.stampIds)
      const remarks = input.remarks ?? ''
      const documentNumber =
        input.documentNumber ??
        (await getNextDocumentNumber(input.documentType, input.clientId)).formatted
      const created = await createDocument({
        documentType: input.documentType,
        documentNumber,
        issueDate: input.issueDate,
        clientId: input.clientId,
        detailMode: 'direct',
        lines: toLineInputs(input.lines),
        externalAmount: 0,
        options: mergeOptions(await defaultOptionsFor(input.documentType), input.options, remarks),
        stampIds: await resolveStampIds(input.stampIds),
        remarks,
      })
      return withPdf(deps, created.id, input.generatePdf)
    },

    updateDocument: async (input: DocumentPatch) => {
      const { id, generatePdf, ...patch } = input
      const { doc, lines } = await requireDocument(id)
      if (patch.clientId) await assertClientExists(patch.clientId)
      if (patch.stampIds) await assertStampsExist(patch.stampIds)
      await updateDocument(id, mergeExistingDraft(doc, lines, patch))
      return withPdf(deps, id, generatePdf)
    },

    generatePdf: async (id: string) => {
      await requireDocument(id)
      return deps.generatePdf(id)
    },
  }
}

export type McpTools = ReturnType<typeof createTools>
