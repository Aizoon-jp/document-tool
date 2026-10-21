import type {
  Document,
  DocumentDraft,
  DocumentLine,
  DocumentLineInput,
  DocumentOptions,
  DocumentType,
} from '../../renderer/types'
import { DEFAULT_OPTIONS, listDocumentSettings } from '../ipc/documentSettings'
import { listStamps } from '../ipc/stamps'
import type { LineInput, OptionsInput } from './schemas'

export function toLineInputs(lines: LineInput[]): DocumentLineInput[] {
  return lines.map((l) => ({
    itemId: null,
    content: l.content,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    isReducedTaxRate: l.isReducedTaxRate,
  }))
}

function fromSavedLines(lines: DocumentLine[]): DocumentLineInput[] {
  return lines.map((l) => ({
    itemId: null,
    content: l.content,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    isReducedTaxRate: l.isReducedTaxRate,
  }))
}

/** 書類別設定の既定オプション。設定が無い種別は組み込みの既定値を使う */
export async function defaultOptionsFor(type: DocumentType): Promise<DocumentOptions> {
  const settings = await listDocumentSettings()
  return settings.find((s) => s.documentType === type)?.defaultOptions ?? DEFAULT_OPTIONS
}

/**
 * base に override を重ねる。remarks が非空で showRemarks の指定が無ければ備考欄を表示する
 * （備考を渡したのに書類に出ない事故を防ぐ）。
 */
export function mergeOptions(
  base: DocumentOptions,
  override: OptionsInput | undefined,
  remarks: string
): DocumentOptions {
  const merged = { ...base, ...override }
  if (remarks.trim() !== '' && override?.showRemarks === undefined) {
    merged.showRemarks = true
  }
  return merged
}

export async function resolveStampIds(requested: string[] | undefined): Promise<string[]> {
  if (requested) return requested
  const stamps = await listStamps()
  const defaultStamp = stamps.find((s) => s.isDefault)
  return defaultStamp ? [defaultStamp.id] : []
}

/** 税額確認用の下書き。取引先・番号などは計算に影響しないためダミーを入れる */
export async function buildCalculationDraft(
  documentType: DocumentType,
  lines: LineInput[],
  options: OptionsInput | undefined
): Promise<DocumentDraft> {
  return {
    documentType,
    documentNumber: '',
    issueDate: '',
    clientId: '',
    detailMode: 'direct',
    lines: toLineInputs(lines),
    externalAmount: 0,
    options: mergeOptions(await defaultOptionsFor(documentType), options, ''),
    stampIds: [],
    remarks: '',
  }
}

/** 既存書類を下書きへ戻し、指定された項目だけ上書きする（update_document 用） */
export function mergeExistingDraft(
  existing: Document,
  existingLines: DocumentLine[],
  patch: {
    documentType?: DocumentType
    clientId?: string
    issueDate?: string
    documentNumber?: string
    lines?: LineInput[]
    remarks?: string
    options?: OptionsInput
    stampIds?: string[]
  }
): DocumentDraft {
  const remarks = patch.remarks ?? existing.remarks ?? ''
  const replacesLines = patch.lines !== undefined
  // 明細なし（金額のみ）の書類に明細を渡したら明細モードへ切り替える
  const detailMode = replacesLines ? 'direct' : existing.detailMode
  return {
    documentType: patch.documentType ?? existing.documentType,
    documentNumber: patch.documentNumber ?? existing.documentNumber,
    issueDate: patch.issueDate ?? existing.issueDate,
    clientId: patch.clientId ?? existing.clientId,
    detailMode,
    lines: replacesLines ? toLineInputs(patch.lines ?? []) : fromSavedLines(existingLines),
    externalAmount: detailMode === 'external' ? existing.subtotal : 0,
    options: mergeOptions(existing.options, patch.options, patch.remarks ?? ''),
    stampIds: patch.stampIds ?? (existing.stampId ? [existing.stampId] : []),
    remarks,
  }
}
