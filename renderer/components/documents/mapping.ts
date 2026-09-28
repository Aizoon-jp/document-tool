import { DOCUMENT_TYPE_LABEL, Document, DocumentLine } from '../../types'
import { DocumentFormValues } from './schema'

/**
 * 既存書類（documents + document_lines）をフォーム初期値に変換する。
 *
 * 複製（/documents/new?from=）・編集再発行（/documents/new?base=）・
 * 書類詳細のプレビューで共通利用する単一の変換ロジック。
 * 明細が0件の場合は書類種別名から仮の1行を生成する。
 */
export const toFormValues = (
  doc: Document,
  lines: DocumentLine[]
): DocumentFormValues => ({
  documentType: doc.documentType,
  clientId: doc.clientId,
  issueDate: doc.issueDate,
  documentNumber: doc.documentNumber,
  detailMode: doc.detailMode,
  lines:
    lines.length > 0
      ? lines.map((l) => ({
          itemId: null,
          content: l.content,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          isReducedTaxRate: l.isReducedTaxRate,
        }))
      : [
          {
            itemId: null,
            content: `${DOCUMENT_TYPE_LABEL[doc.documentType]}業務一式`,
            quantity: 1,
            unit: '式',
            unitPrice: doc.subtotal,
            taxRate: 10,
            isReducedTaxRate: false,
          },
        ],
  externalAmount: doc.detailMode === 'external' ? doc.subtotal : 0,
  options: doc.options,
  stampIds: doc.stampId ? [doc.stampId] : [],
  remarks: doc.remarks ?? '',
})
