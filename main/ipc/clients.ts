import { asc, eq } from 'drizzle-orm'
import type { Client, ClientInput, Honorific, TaxCategory } from '../../renderer/types'
import { getDatabase, schema } from '../db/client'
import { generateId } from '../helpers/id'
import { nowIso } from '../helpers/serialize'

function toClient(row: typeof schema.clients.$inferSelect): Client {
  return {
    id: row.id,
    name: row.name,
    honorific: row.honorific as Honorific,
    postalCode: row.postalCode,
    address: row.address,
    tel: row.tel,
    contactPerson: row.contactPerson,
    contactDepartment: row.contactDepartment,
    paymentTerms: row.paymentTerms,
    defaultTaxCategory: row.defaultTaxCategory as TaxCategory,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listClients(): Promise<Client[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.clients)
    .orderBy(asc(schema.clients.name))
  return rows.map(toClient)
}

export async function getClient(id: string): Promise<Client | null> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, id))
    .limit(1)
  return rows.length > 0 ? toClient(rows[0]) : null
}

export async function createClient(input: ClientInput): Promise<Client> {
  const db = getDatabase()
  const id = generateId()
  const now = nowIso()
  const inserted = await db
    .insert(schema.clients)
    .values({ id, ...input, createdAt: now, updatedAt: now })
    .returning()
  return toClient(inserted[0])
}

export async function updateClient(
  id: string,
  input: ClientInput
): Promise<Client> {
  const db = getDatabase()
  const now = nowIso()
  const updated = await db
    .update(schema.clients)
    .set({ ...input, updatedAt: now })
    .where(eq(schema.clients.id, id))
    .returning()
  if (updated.length === 0) {
    throw new Error(`Client not found: ${id}`)
  }
  return toClient(updated[0])
}

export async function deleteClient(id: string): Promise<void> {
  const db = getDatabase()
  const referenced = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(eq(schema.documents.clientId, id))
    .limit(1)
  if (referenced.length > 0) {
    throw new Error('書類から参照されているため削除できません')
  }
  await db.delete(schema.clients).where(eq(schema.clients.id, id))
}
