import { and, eq, like } from 'drizzle-orm'
import type { DocumentType, NextDocumentNumber } from '../../renderer/types'
import { getDatabase, schema } from '../db/client'

function pad(value: number, digits: number): string {
  return value.toString().padStart(digits, '0')
}

function yearMonth(date: Date): { yyyy: string; mm: string } {
  const yyyy = date.getFullYear().toString()
  const mm = pad(date.getMonth() + 1, 2)
  return { yyyy, mm }
}

export function formatNumber(
  format: string,
  yyyy: string,
  mm: string,
  sequence: number
): string {
  return format
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{seq:(\d+)\}/g, (_match, n: string) => pad(sequence, parseInt(n, 10)))
    .replace(/\{seq\}/g, sequence.toString())
}

export async function getNextDocumentNumber(
  type: DocumentType,
  now: Date = new Date()
): Promise<NextDocumentNumber> {
  const db = getDatabase()
  const setting = await db
    .select()
    .from(schema.documentSettings)
    .where(eq(schema.documentSettings.documentType, type))
    .limit(1)
  if (setting.length === 0) {
    throw new Error(`書類別設定が未登録です: ${type}`)
  }
  const format = setting[0].numberFormat
  const { yyyy, mm } = yearMonth(now)

  const prefix = format
    .split('{seq')[0]
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g, mm)

  const rows = await db
    .select({ documentNumber: schema.documents.documentNumber })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.documentType, type),
        like(schema.documents.documentNumber, `${prefix}%`)
      )
    )

  const seqMatch = format.match(/\{seq:(\d+)\}/)
  const seqDigits = seqMatch ? parseInt(seqMatch[1], 10) : 1
  let max = 0
  for (const row of rows) {
    const rest = row.documentNumber.slice(prefix.length)
    const seqStr = rest.slice(0, seqDigits)
    const n = parseInt(seqStr, 10)
    if (!Number.isNaN(n) && n > max) max = n
  }

  const sequence = max + 1
  return {
    documentType: type,
    yearMonth: `${yyyy}-${mm}`,
    sequence,
    formatted: formatNumber(format, yyyy, mm, sequence),
  }
}
