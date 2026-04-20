import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { asc, desc, eq } from 'drizzle-orm'
import type { Stamp } from '../../renderer/types'
import type {
  StampCreateInput,
  StampUpdateInput,
} from '../../shared/types/ipc'
import { getDatabase, schema } from '../db/client'
import { generateId } from '../helpers/id'
import { nowIso } from '../helpers/serialize'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function stampsDir(): string {
  const dir = path.join(app.getPath('userData'), 'stamps')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function toStamp(row: typeof schema.stamps.$inferSelect): Stamp {
  return {
    id: row.id,
    name: row.name,
    imagePath: row.imagePath,
    defaultXMm: row.defaultXMm,
    defaultYMm: row.defaultYMm,
    widthMm: row.widthMm,
    opacity: row.opacity,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  }
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: 'png' | 'jpg' } {
  const match = dataUrl.match(/^data:(image\/(png|jpeg));base64,(.+)$/)
  if (!match) {
    throw new Error('PNGまたはJPG形式のみ対応')
  }
  const ext = match[2] === 'png' ? 'png' : 'jpg'
  const buffer = Buffer.from(match[3], 'base64')
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw new Error('5MB以下のファイルを選択してください')
  }
  return { buffer, ext }
}

function saveImage(id: string, dataUrl: string): string {
  const { buffer, ext } = decodeDataUrl(dataUrl)
  const fileName = `stamp_${id}.${ext}`
  const safe = path.basename(fileName)
  const filePath = path.join(stampsDir(), safe)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

function deleteImage(filePath: string | null | undefined): void {
  if (!filePath) return
  const safe = path.basename(filePath)
  const full = path.join(stampsDir(), safe)
  if (fs.existsSync(full)) {
    fs.unlinkSync(full)
  }
}

export async function listStamps(): Promise<Stamp[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.stamps)
    .orderBy(desc(schema.stamps.isDefault), asc(schema.stamps.name))
  return rows.map(toStamp)
}

export async function getStamp(id: string): Promise<Stamp | null> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(schema.stamps)
    .where(eq(schema.stamps.id, id))
    .limit(1)
  return rows.length > 0 ? toStamp(rows[0]) : null
}

export async function createStamp(input: StampCreateInput): Promise<Stamp> {
  const db = getDatabase()
  const id = generateId()
  const imagePath = saveImage(id, input.imageDataUrl)
  const now = nowIso()

  return db.transaction((tx) => {
    if (input.isDefault) {
      tx.update(schema.stamps)
        .set({ isDefault: false })
        .where(eq(schema.stamps.isDefault, true))
        .run()
    }
    const inserted = tx
      .insert(schema.stamps)
      .values({
        id,
        name: input.name,
        imagePath,
        defaultXMm: input.defaultXMm,
        defaultYMm: input.defaultYMm,
        widthMm: input.widthMm,
        opacity: input.opacity,
        isDefault: input.isDefault,
        createdAt: now,
      })
      .returning()
      .all()
    return toStamp(inserted[0])
  })
}

export async function updateStamp(
  id: string,
  input: StampUpdateInput
): Promise<Stamp> {
  const db = getDatabase()
  const existing = await db
    .select()
    .from(schema.stamps)
    .where(eq(schema.stamps.id, id))
    .limit(1)
  if (existing.length === 0) {
    throw new Error(`Stamp not found: ${id}`)
  }

  let imagePath = existing[0].imagePath
  if (input.imageDataUrl) {
    deleteImage(imagePath)
    imagePath = saveImage(id, input.imageDataUrl)
  }

  return db.transaction((tx) => {
    if (input.isDefault) {
      tx.update(schema.stamps)
        .set({ isDefault: false })
        .where(eq(schema.stamps.isDefault, true))
        .run()
    }
    const merged = {
      name: input.name ?? existing[0].name,
      imagePath,
      defaultXMm: input.defaultXMm ?? existing[0].defaultXMm,
      defaultYMm: input.defaultYMm ?? existing[0].defaultYMm,
      widthMm: input.widthMm ?? existing[0].widthMm,
      opacity: input.opacity ?? existing[0].opacity,
      isDefault: input.isDefault ?? existing[0].isDefault,
    }
    const updated = tx
      .update(schema.stamps)
      .set(merged)
      .where(eq(schema.stamps.id, id))
      .returning()
      .all()
    return toStamp(updated[0])
  })
}

export async function deleteStamp(id: string): Promise<void> {
  const db = getDatabase()
  const existing = await db
    .select()
    .from(schema.stamps)
    .where(eq(schema.stamps.id, id))
    .limit(1)
  if (existing.length === 0) return

  deleteImage(existing[0].imagePath)
  await db.delete(schema.stamps).where(eq(schema.stamps.id, id))
}
