import { eq } from 'drizzle-orm'
import type { Company, CompanyInput } from '../../renderer/types'
import { getDatabase, schema } from '../db/client'
import { generateId } from '../helpers/id'
import { nowIso } from '../helpers/serialize'

const FIXED_ID = 'company-default'

function toCompany(row: typeof schema.companies.$inferSelect): Company {
  return {
    id: row.id,
    name: row.name,
    tradeName: row.tradeName,
    postalCode: row.postalCode,
    address: row.address,
    tel: row.tel,
    fax: row.fax,
    email: row.email,
    website: row.website,
    representativeName: row.representativeName,
    invoiceNumber: row.invoiceNumber,
    bankName: row.bankName,
    bankBranch: row.bankBranch,
    bankAccountType: row.bankAccountType as Company['bankAccountType'],
    bankAccountNumber: row.bankAccountNumber,
    bankAccountHolderKana: row.bankAccountHolderKana,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getCompany(): Promise<Company | null> {
  const db = getDatabase()
  const rows = await db.select().from(schema.companies).limit(1)
  return rows.length > 0 ? toCompany(rows[0]) : null
}

export async function updateCompany(input: CompanyInput): Promise<Company> {
  const db = getDatabase()
  const existing = await db.select().from(schema.companies).limit(1)
  const now = nowIso()

  if (existing.length === 0) {
    const id = generateId()
    const inserted = await db
      .insert(schema.companies)
      .values({
        id,
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return toCompany(inserted[0])
  }

  const updated = await db
    .update(schema.companies)
    .set({ ...input, updatedAt: now })
    .where(eq(schema.companies.id, existing[0].id))
    .returning()
  return toCompany(updated[0])
}

export { FIXED_ID as COMPANY_FIXED_ID }
