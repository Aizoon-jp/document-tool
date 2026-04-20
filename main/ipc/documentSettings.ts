import { asc, eq } from 'drizzle-orm'
import type {
  DocumentOptions,
  DocumentSetting,
  DocumentSettingInput,
  DocumentType,
} from '../../renderer/types'
import { getDatabase, schema } from '../db/client'
import { generateId } from '../helpers/id'
import { deserializeOptions, nowIso, serializeOptions } from '../helpers/serialize'

function toDocumentSetting(
  row: typeof schema.documentSettings.$inferSelect
): DocumentSetting {
  return {
    id: row.id,
    documentType: row.documentType as DocumentType,
    numberFormat: row.numberFormat,
    defaultOptions: deserializeOptions(row.defaultOptions),
    defaultRemarks: row.defaultRemarks,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const DEFAULT_OPTIONS: DocumentOptions = {
  includeTax: true,
  reducedTaxRate: true,
  withholdingTax: false,
  showRemarks: true,
  showBankInfo: true,
}

export const DEFAULT_SETTINGS: Record<
  DocumentType,
  { numberFormat: string; defaultRemarks: string }
> = {
  invoice: {
    numberFormat: 'INV-{YYYY}-{MM}-{seq:3}',
    defaultRemarks: 'お振込手数料はお客様にてご負担ください。',
  },
  receipt: {
    numberFormat: 'RCP-{YYYY}-{MM}-{seq:3}',
    defaultRemarks: '上記、正に領収いたしました。',
  },
  quote: {
    numberFormat: 'QT-{YYYY}-{MM}-{seq:3}',
    defaultRemarks: 'お見積有効期限：発行日より30日間',
  },
  payment_request: {
    numberFormat: 'PR-{YYYY}-{MM}-{seq:3}',
    defaultRemarks: '下記口座へお振込をお願いいたします。',
  },
  delivery_note: {
    numberFormat: 'DN-{YYYY}-{MM}-{seq:3}',
    defaultRemarks: '上記の通り納品いたしました。',
  },
}

export async function listDocumentSettings(): Promise<DocumentSetting[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.documentSettings)
    .orderBy(asc(schema.documentSettings.documentType))
  return rows.map(toDocumentSetting)
}

export async function updateDocumentSetting(
  type: DocumentType,
  input: DocumentSettingInput
): Promise<DocumentSetting> {
  const db = getDatabase()
  const existing = await db
    .select()
    .from(schema.documentSettings)
    .where(eq(schema.documentSettings.documentType, type))
    .limit(1)
  const now = nowIso()
  const payload = {
    documentType: type,
    numberFormat: input.numberFormat,
    defaultOptions: serializeOptions(input.defaultOptions),
    defaultRemarks: input.defaultRemarks,
    updatedAt: now,
  }

  if (existing.length === 0) {
    const inserted = await db
      .insert(schema.documentSettings)
      .values({ id: generateId(), ...payload, createdAt: now })
      .returning()
    return toDocumentSetting(inserted[0])
  }

  const updated = await db
    .update(schema.documentSettings)
    .set(payload)
    .where(eq(schema.documentSettings.id, existing[0].id))
    .returning()
  return toDocumentSetting(updated[0])
}

export async function seedDefaultDocumentSettings(): Promise<void> {
  const db = getDatabase()
  const existing = await db.select().from(schema.documentSettings)
  const existingTypes = new Set(existing.map((r) => r.documentType))
  const now = nowIso()

  const types = Object.keys(DEFAULT_SETTINGS) as DocumentType[]
  const missing = types.filter((t) => !existingTypes.has(t))
  if (missing.length === 0) return

  await db.insert(schema.documentSettings).values(
    missing.map((type) => ({
      id: generateId(),
      documentType: type,
      numberFormat: DEFAULT_SETTINGS[type].numberFormat,
      defaultOptions: serializeOptions(DEFAULT_OPTIONS),
      defaultRemarks: DEFAULT_SETTINGS[type].defaultRemarks,
      createdAt: now,
      updatedAt: now,
    }))
  )
}
