import fs from 'fs'
import path from 'path'
import { BrowserWindow, app } from 'electron'
import { eq } from 'drizzle-orm'
import { getDatabase, schema } from '../db/client'
import { getDocument, getDocumentLines } from '../ipc/documents'
import { getCompany } from '../ipc/company'
import { getClient } from '../ipc/clients'
import { renderDocumentHtml } from './htmlTemplate'

function pdfOutputDir(): string {
  const dir = path.join(app.getPath('documents'), '事務ツール')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function imageToDataUrl(filePath: string | null): string | null {
  if (!filePath || !fs.existsSync(filePath)) return null
  const ext = path.extname(filePath).toLowerCase()
  const mime =
    ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : null
  if (!mime) return null
  const buf = fs.readFileSync(filePath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function renderInHiddenWindow(html: string): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: true,
    },
  })
  try {
    await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
    })
  } finally {
    win.destroy()
  }
}

export async function generatePdf(documentId: string): Promise<{ filePath: string }> {
  const doc = await getDocument(documentId)
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`)
  }
  const [lines, client, company] = await Promise.all([
    getDocumentLines(documentId),
    getClient(doc.clientId),
    getCompany(),
  ])
  if (!client) throw new Error(`Client not found: ${doc.clientId}`)
  if (!company) throw new Error('会社基本情報が未登録です')

  let stamp = null
  let stampDataUrl: string | null = null
  if (doc.stampId) {
    const db = getDatabase()
    const stampRows = await db
      .select()
      .from(schema.stamps)
      .where(eq(schema.stamps.id, doc.stampId))
      .limit(1)
    if (stampRows.length > 0) {
      stamp = {
        id: stampRows[0].id,
        name: stampRows[0].name,
        imagePath: stampRows[0].imagePath,
        defaultXMm: stampRows[0].defaultXMm,
        defaultYMm: stampRows[0].defaultYMm,
        widthMm: stampRows[0].widthMm,
        opacity: stampRows[0].opacity,
        isDefault: stampRows[0].isDefault,
        createdAt: stampRows[0].createdAt,
      }
      stampDataUrl = imageToDataUrl(stampRows[0].imagePath)
    }
  }

  const html = renderDocumentHtml({
    document: doc,
    lines,
    client,
    company,
    stamp,
    stampImageDataUrl: stampDataUrl,
  })

  const pdf = await renderInHiddenWindow(html)
  const safeName = doc.documentNumber.replace(/[\\/:*?"<>|]/g, '_')
  const outPath = path.join(pdfOutputDir(), `${safeName}.pdf`)
  fs.writeFileSync(outPath, pdf)

  const db = getDatabase()
  await db
    .update(schema.documents)
    .set({ pdfFilePath: outPath })
    .where(eq(schema.documents.id, documentId))

  return { filePath: outPath }
}
