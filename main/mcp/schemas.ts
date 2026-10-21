import { z } from 'zod'

export const DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'quote',
  'payment_request',
  'delivery_note',
] as const

const isRealDate = (value: string): boolean => {
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で指定してください')
  .refine(isRealDate, '存在しない日付です')

export const documentTypeSchema = z
  .enum(DOCUMENT_TYPES, {
    errorMap: () => ({ message: `書類種別は ${DOCUMENT_TYPES.join(' / ')} のいずれかで指定してください` }),
  })
  .describe(
    '書類種別。invoice=請求書 / receipt=領収書 / quote=見積書 / payment_request=振込依頼書 / delivery_note=納品書'
  )

const taxRateSchema = z.union([z.literal(10), z.literal(8), z.literal(0)], {
  errorMap: () => ({ message: '税率は 10 / 8 / 0 のいずれかで指定してください' }),
})

export const lineSchema = z.object({
  content: z.string().trim().min(1, '品目・内容は必須です').describe('品目・内容（例: Webサイト制作費）'),
  quantity: z.number().positive('数量は0より大きい数で指定してください').describe('数量（0より大きい数）'),
  unit: z.string().trim().default('式').describe('単位（例: 式 / 個 / 時間）'),
  unitPrice: z.number().finite().describe('税抜単価（円）。税込金額ではない'),
  taxRate: taxRateSchema.default(10).describe('消費税率。10 / 8 / 0（非課税・不課税）のいずれか'),
  isReducedTaxRate: z
    .boolean()
    .default(false)
    .describe('軽減税率（8%）の対象なら true。書類に「※」が付く'),
})

export const optionsSchema = z
  .object({
    includeTax: z.boolean().describe('消費税を加算する（false なら税込扱いの表示）'),
    reducedTaxRate: z.boolean().describe('軽減税率の注記を表示する'),
    withholdingTax: z.boolean().describe('源泉徴収税を差し引く'),
    showRemarks: z.boolean().describe('備考欄を表示する'),
    showBankInfo: z.boolean().describe('振込先情報を表示する'),
  })
  .partial()
  .describe('表示・計算オプション。指定した項目だけ上書きされ、省略した項目は既定値（書類別設定）を使う')

export const idSchema = z.string().trim().min(1)

const optionalText = z.string().trim().min(1).optional()

export const clientInputSchema = z.object({
  name: z.string().trim().min(1).describe('取引先名（会社名・氏名）'),
  honorific: z.enum(['御中', '様']).default('御中').describe('敬称。法人は御中、個人は様'),
  postalCode: optionalText.describe('郵便番号（例: 123-4567）'),
  address: optionalText.describe('住所'),
  tel: optionalText.describe('電話番号'),
  contactPerson: optionalText.describe('担当者名'),
  contactDepartment: optionalText.describe('担当部署'),
  paymentTerms: optionalText.describe('支払条件（例: 月末締め翌月末払い）'),
  defaultTaxCategory: z
    .enum(['taxable_10', 'taxable_8', 'tax_free'])
    .default('taxable_10')
    .describe('既定の税区分'),
  numberPrefix: optionalText.describe('書類番号の接頭辞。通常は省略'),
  notes: optionalText.describe('メモ'),
})

export const calculateInputShape = {
  documentType: documentTypeSchema,
  lines: z.array(lineSchema).min(1, '明細行は1行以上必要です').describe('明細行'),
  options: optionsSchema.optional(),
}

const documentNumberSchema = z
  .string()
  .trim()
  .min(1)
  .describe('書類番号。省略すると自動採番される（原則省略する）')
const remarksSchema = z.string().describe('備考。空でなければ備考欄が表示される')
const stampIdsSchema = z
  .array(idSchema)
  .describe('角印ID（list_stamps で取得）。省略すると既定の角印1件、無ければ角印なし')
const generatePdfSchema = z.boolean().default(true).describe('保存後にPDFを生成する（既定 true）')

export const createDocumentShape = {
  documentType: documentTypeSchema,
  clientId: idSchema.describe('取引先ID（list_clients で取得）'),
  issueDate: dateSchema.describe('発行日 YYYY-MM-DD'),
  documentNumber: documentNumberSchema.optional(),
  lines: calculateInputShape.lines,
  remarks: remarksSchema.optional(),
  options: optionsSchema.optional(),
  stampIds: stampIdsSchema.optional(),
  generatePdf: generatePdfSchema,
}

export const updateDocumentShape = {
  id: idSchema.describe('更新する書類のID'),
  documentType: documentTypeSchema.optional(),
  clientId: idSchema.optional().describe('取引先ID'),
  issueDate: dateSchema.optional().describe('発行日 YYYY-MM-DD'),
  documentNumber: documentNumberSchema.optional(),
  lines: calculateInputShape.lines.optional().describe('明細行。指定すると全行が置き換わる'),
  remarks: remarksSchema.optional(),
  options: optionsSchema.optional(),
  stampIds: stampIdsSchema.optional(),
  generatePdf: generatePdfSchema,
}

export const searchDocumentsShape = {
  clientName: z.string().optional().describe('取引先名の部分一致'),
  startDate: dateSchema.optional().describe('発行日の下限 YYYY-MM-DD'),
  endDate: dateSchema.optional().describe('発行日の上限 YYYY-MM-DD'),
  documentType: documentTypeSchema.optional(),
}

export const idShape = { id: idSchema.describe('書類ID') }

export type LineInput = z.infer<typeof lineSchema>
export type OptionsInput = z.infer<typeof optionsSchema>
export type ClientToolInput = z.infer<typeof clientInputSchema>
