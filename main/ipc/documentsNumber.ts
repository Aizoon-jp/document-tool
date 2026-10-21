import { and, desc, eq, like, ne } from 'drizzle-orm'
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

async function loadClientPrefix(clientId: string | undefined): Promise<string> {
  if (!clientId) return ''
  const db = getDatabase()
  const rows = await db
    .select({ numberPrefix: schema.clients.numberPrefix })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .limit(1)
  return rows[0]?.numberPrefix?.trim() ?? ''
}

async function findLatestClientDocumentNumber(
  type: DocumentType,
  clientId: string
): Promise<string | null> {
  const db = getDatabase()
  const rows = await db
    .select({ documentNumber: schema.documents.documentNumber })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.documentType, type),
        eq(schema.documents.clientId, clientId)
      )
    )
    .orderBy(desc(schema.documents.createdAt))
    .limit(1)
  return rows[0]?.documentNumber ?? null
}

/**
 * 書類番号が書式（例: INV-{YYYY}-{MM}-{seq:3}）から採番されたものか判定する。
 * 書式どおりの番号は年月を含むため、末尾+1 で追従すると月をまたいで他社の番号と衝突する。
 */
export function matchesNumberFormat(format: string, docNumber: string): boolean {
  const pattern = format
    .split(/(\{YYYY\}|\{MM\}|\{seq:\d+\}|\{seq\})/)
    .map((part) => {
      if (part === '{YYYY}') return '\\d{4}'
      if (part === '{MM}') return '\\d{2}'
      if (part === '{seq}') return '\\d+'
      const seq = part.match(/^\{seq:(\d+)\}$/)
      if (seq) return `\\d{${seq[1]},}`
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return new RegExp(`^${pattern}$`).test(docNumber)
}

export async function isDocumentNumberTaken(
  docNumber: string,
  excludeId?: string
): Promise<boolean> {
  const db = getDatabase()
  const rows = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(
      excludeId
        ? and(eq(schema.documents.documentNumber, docNumber), ne(schema.documents.id, excludeId))
        : eq(schema.documents.documentNumber, docNumber)
    )
    .limit(1)
  return rows.length > 0
}

function incrementTailNumber(docNumber: string): string | null {
  const match = docNumber.match(/^(.*?)(\d+)(\D*)$/)
  if (!match) return null
  const [, head, seqStr, tail] = match
  const digits = seqStr.length
  const seq = parseInt(seqStr, 10) + 1
  return `${head}${seq.toString().padStart(digits, '0')}${tail}`
}

export async function getNextDocumentNumber(
  type: DocumentType,
  clientId?: string,
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
  const baseFormat = setting[0].numberFormat
  const { yyyy, mm } = yearMonth(now)
  const clientPrefix = await loadClientPrefix(clientId)

  // 取引先の独自番号（書式外の番号）だけを末尾+1 で追従する。
  // 書式どおりの番号や、追従先が既に使われている場合は全社連番に任せる。
  if (!clientPrefix && clientId) {
    const latest = await findLatestClientDocumentNumber(type, clientId)
    const incremented =
      latest && !matchesNumberFormat(baseFormat, latest) ? incrementTailNumber(latest) : null
    if (incremented && !(await isDocumentNumberTaken(incremented))) {
      return {
        documentType: type,
        yearMonth: `${yyyy}-${mm}`,
        sequence: 0,
        formatted: incremented,
      }
    }
  }

  const format = clientPrefix ? `${clientPrefix}${baseFormat}` : baseFormat
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
