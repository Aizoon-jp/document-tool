import { z } from 'zod'

export const documentLineSchema = z.object({
  itemId: z.string().nullable(),
  content: z.string().min(1, '品目名は必須です'),
  quantity: z.coerce.number().min(0, '0以上を入力'),
  unit: z.string(),
  unitPrice: z.coerce.number().min(0, '0以上を入力'),
  taxRate: z.union([z.literal(10), z.literal(8), z.literal(0)]),
  isReducedTaxRate: z.boolean(),
})

export const documentFormSchema = z.object({
  documentType: z.enum([
    'invoice',
    'receipt',
    'quote',
    'payment_request',
    'delivery_note',
  ]),
  clientId: z.string().min(1, '取引先を選択してください'),
  issueDate: z.string().min(1, '発行日は必須です'),
  documentNumber: z.string().min(1),
  detailMode: z.enum(['direct', 'external']),
  lines: z.array(documentLineSchema),
  externalAmount: z.coerce.number().min(0),
  options: z.object({
    includeTax: z.boolean(),
    reducedTaxRate: z.boolean(),
    withholdingTax: z.boolean(),
    showRemarks: z.boolean(),
    showBankInfo: z.boolean(),
  }),
  stampIds: z.array(z.string()),
  remarks: z.string(),
})

export type DocumentFormValues = z.infer<typeof documentFormSchema>
export type DocumentLineFormValue = z.infer<typeof documentLineSchema>
