import { asc, eq } from 'drizzle-orm'
import type { Item, ItemInput, TaxRate } from '../../renderer/types'
import { getDatabase, schema } from '../db/client'
import { generateId } from '../helpers/id'
import { nowIso } from '../helpers/serialize'

function toItem(row: typeof schema.items.$inferSelect): Item {
  return {
    id: row.id,
    name: row.name,
    unitPrice: row.unitPrice,
    unit: row.unit,
    taxRate: row.taxRate as TaxRate,
    isReducedTaxRate: row.isReducedTaxRate,
    defaultQuantity: row.defaultQuantity,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listItems(): Promise<Item[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.items)
    .orderBy(asc(schema.items.name))
  return rows.map(toItem)
}

export async function getItem(id: string): Promise<Item | null> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.id, id))
    .limit(1)
  return rows.length > 0 ? toItem(rows[0]) : null
}

export async function createItem(input: ItemInput): Promise<Item> {
  const db = getDatabase()
  const id = generateId()
  const now = nowIso()
  const inserted = await db
    .insert(schema.items)
    .values({ id, ...input, createdAt: now, updatedAt: now })
    .returning()
  return toItem(inserted[0])
}

export async function updateItem(id: string, input: ItemInput): Promise<Item> {
  const db = getDatabase()
  const now = nowIso()
  const updated = await db
    .update(schema.items)
    .set({ ...input, updatedAt: now })
    .where(eq(schema.items.id, id))
    .returning()
  if (updated.length === 0) {
    throw new Error(`Item not found: ${id}`)
  }
  return toItem(updated[0])
}

export async function deleteItem(id: string): Promise<void> {
  const db = getDatabase()
  await db.delete(schema.items).where(eq(schema.items.id, id))
}
