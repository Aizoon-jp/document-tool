import type {
  Client,
  Company,
  Document,
  DocumentLine,
  DocumentType,
  Stamp,
} from '../../renderer/types'
import { buildTaxBreakdown } from '../ipc/taxCalc'

const DOCUMENT_TITLE: Record<DocumentType, string> = {
  invoice: '請 求 書',
  receipt: '領 収 書',
  quote: '御 見 積 書',
  payment_request: '振 込 依 頼 書',
  delivery_note: '納 品 書',
}

const DOCUMENT_NOUN: Record<DocumentType, string> = {
  invoice: '請求',
  receipt: '領収',
  quote: 'お見積り',
  payment_request: 'お振込み',
  delivery_note: '納品',
}

const NUMBER_LABEL: Record<DocumentType, string> = {
  invoice: '請求書番号',
  receipt: '領収書番号',
  quote: '見積書番号',
  payment_request: '振込依頼書番号',
  delivery_note: '納品書番号',
}

function yen(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateJa(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`
}

function renderLines(lines: DocumentLine[]): string {
  return lines
    .map(
      (line) => `
    <tr>
      <td class="content">${escapeHtml(line.content)}${
        line.isReducedTaxRate ? '<span class="reduced">※軽減8%</span>' : ''
      }</td>
      <td class="r num">${line.quantity}</td>
      <td class="c">${escapeHtml(line.unit)}</td>
      <td class="r num">${yen(line.unitPrice)}</td>
      <td class="r num">${yen(line.subtotalExclTax)}</td>
    </tr>`
    )
    .join('')
}

function renderBankInfo(company: Company): string {
  if (!company.bankName) return ''
  const type =
    company.bankAccountType === 'ordinary'
      ? '普通'
      : company.bankAccountType === 'checking'
        ? '当座'
        : ''
  const line1 = [
    company.bankName,
    company.bankBranch ?? '',
    type,
    company.bankAccountNumber ?? '',
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' ')
  return `
    <div class="bank">
      <div class="section-title">お振込先</div>
      <div>${line1}</div>
      ${
        company.bankAccountHolderKana
          ? `<div>名義：${escapeHtml(company.bankAccountHolderKana)}</div>`
          : ''
      }
    </div>`
}

function renderStamp(stamp: Stamp | null, imageDataUrl: string | null): string {
  if (!stamp || !imageDataUrl) return ''
  return `<img class="stamp" src="${imageDataUrl}" style="left:${stamp.defaultXMm}mm;top:${stamp.defaultYMm}mm;width:${stamp.widthMm}mm;opacity:${stamp.opacity};" />`
}

export interface TemplateInput {
  document: Document
  lines: DocumentLine[]
  client: Client
  company: Company
  stamp: Stamp | null
  stampImageDataUrl: string | null
}

export function renderDocumentHtml(input: TemplateInput): string {
  const { document, lines, client, company, stamp, stampImageDataUrl } = input
  const title = DOCUMENT_TITLE[document.documentType]
  const noun = DOCUMENT_NOUN[document.documentType]
  const numberLabel = NUMBER_LABEL[document.documentType]
  const hasReduced = lines.some((l) => l.isReducedTaxRate)
  const netAmount = document.totalAmount - document.withholdingTax
  const amountLabel =
    document.documentType === 'quote'
      ? 'お見積り金額'
      : document.documentType === 'receipt'
        ? '領収金額'
        : 'ご請求金額'
  const includeTax = document.options.includeTax !== false

  // 適格請求書の記載事項：税率ごとに区分した対価の額・適用税率・消費税額。
  // 消費税額は税率ごとに1回だけ端数処理する（buildTaxBreakdown）。
  const taxBreakdown =
    document.detailMode === 'external'
      ? []
      : buildTaxBreakdown(
          lines.map((l) => ({ taxRate: l.taxRate, amount: l.subtotalExclTax })),
          includeTax
        )
  const taxRows = includeTax
    ? taxBreakdown
        .filter((e) => e.taxRate > 0)
        .map(
          (e) =>
            `<div class="row"><span class="label">消費税${e.taxRate}%（対象 ${yen(e.taxableAmount)}）</span><span class="num">${yen(e.taxAmount)}</span></div>`
        )
        .join('')
    : ''

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>${title} ${escapeHtml(document.documentNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; font-family: "Noto Sans JP", "Hiragino Sans", sans-serif; color: #0f172a; }
  body { padding: 18mm 18mm 16mm; width: 210mm; box-sizing: border-box; position: relative; font-size: 10pt; line-height: 1.5; }

  h1 { text-align: center; letter-spacing: 0.4em; font-size: 22pt; font-weight: 600; margin: 0 0 10mm 0; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-bottom: 6mm; }
  .header .client { flex: 1; padding-top: 4mm; }
  .header .client .name { font-size: 16pt; font-weight: 600; border-bottom: 1.5pt solid #334155; padding-bottom: 2mm; }
  .header .client .addr { margin-top: 1.5mm; font-size: 8.5pt; color: #475569; }

  .header .company { width: 80mm; font-size: 9pt; line-height: 1.6; color: #334155; }
  .header .company .meta { text-align: right; margin-bottom: 4mm; font-size: 9pt; }
  .header .company .meta div { margin-bottom: 0.8mm; }
  .header .company .info { position: relative; }
  .header .company .info .name { font-size: 13pt; font-weight: 700; color: #0f172a; margin-bottom: 2mm; }
  .header .company .info .row { display: flex; gap: 2mm; }
  .header .company .info .row .lbl { color: #64748b; min-width: 18mm; }
  .header .company .info .row .val { color: #334155; }

  .lead { margin: 4mm 0 4mm; font-size: 9.5pt; color: #475569; }

  .total-box { border: 1px solid #cbd5e1; border-radius: 1.5mm; overflow: hidden; margin-bottom: 6mm; }
  .total-box .label { background: #2563eb; color: #ffffff; text-align: center; padding: 2.5mm 4mm; font-size: 11pt; letter-spacing: 0.05em; }
  .total-box .amount { padding: 5mm 8mm; text-align: right; font-size: 24pt; font-weight: 700; letter-spacing: 0.02em; color: #0f172a; }

  table.lines { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 4mm; }
  table.lines thead th { background: #f8fafc; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; padding: 2mm 2.5mm; font-weight: 600; font-size: 9pt; color: #334155; }
  table.lines thead th.col-content { text-align: left; }
  table.lines thead th.col-qty { width: 16mm; text-align: right; }
  table.lines thead th.col-unit { width: 12mm; text-align: center; }
  table.lines thead th.col-price { width: 26mm; text-align: right; }
  table.lines thead th.col-amount { width: 30mm; text-align: right; }
  table.lines tbody td { border-bottom: 1px solid #e2e8f0; padding: 2.2mm 2.5mm; vertical-align: top; }
  table.lines tbody td.content { word-break: break-word; }
  table.lines tbody td.c { text-align: center; color: #475569; }
  table.lines tbody td.r { text-align: right; }
  table.lines tbody td.num { font-variant-numeric: tabular-nums; }
  .reduced { display: inline-block; margin-left: 2mm; padding: 0.3mm 1.2mm; background: #fef3c7; color: #92400e; font-size: 7.5pt; border-radius: 0.8mm; }

  .external-note { border: 1px dashed #94a3b8; padding: 12mm; text-align: center; color: #475569; font-size: 10pt; margin-bottom: 4mm; }

  .summary { margin: 6mm 0 0 auto; width: 80mm; border: 1px solid #cbd5e1; border-radius: 1.5mm; padding: 3mm 5mm; font-size: 10pt; background: #f8fafc; }
  .summary .row { display: flex; justify-content: space-between; padding: 1mm 0; }
  .summary .row .label { color: #475569; }
  .summary .row.withholding { color: #b91c1c; }
  .summary .row.total { border-top: 1.5pt solid #334155; margin-top: 1.5mm; padding-top: 2mm; font-weight: 700; font-size: 12pt; color: #0f172a; }
  .summary .row .num { font-variant-numeric: tabular-nums; }

  .reduced-note { font-size: 8pt; color: #64748b; margin-top: 2mm; }

  .bank { margin-top: 6mm; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 1.5mm; padding: 3.5mm 4mm; font-size: 9pt; }
  .bank .section-title { font-weight: 600; margin-bottom: 1.5mm; padding-left: 2.5mm; border-left: 2.5pt solid #475569; }
  .bank div + div { margin-top: 0.8mm; }

  .remarks { margin-top: 4mm; padding: 3mm 4mm; border: 1px solid #e2e8f0; border-radius: 1.5mm; font-size: 9pt; color: #334155; white-space: pre-wrap; }
  .remarks .section-title { font-weight: 600; margin-bottom: 1.5mm; }

  .stamp { position: absolute; pointer-events: none; }
</style>
</head>
<body>
  ${renderStamp(stamp, stampImageDataUrl)}
  <h1>${title}</h1>

  <div class="header">
    <div class="client">
      <div class="name">${escapeHtml(client.name)} ${escapeHtml(client.honorific)}</div>
      ${
        client.postalCode || client.address
          ? `<div class="addr">${client.postalCode ? `〒${escapeHtml(client.postalCode)} ` : ''}${escapeHtml(client.address ?? '')}</div>`
          : ''
      }
    </div>
    <div class="company">
      <div class="meta">
        <div>${escapeHtml(formatDateJa(document.issueDate))}</div>
        <div>${numberLabel}　${escapeHtml(document.documentNumber)}</div>
      </div>
      <div class="info">
        <div class="name">${escapeHtml(company.name)}</div>
        ${company.postalCode ? `<div class="row"><span class="val">〒${escapeHtml(company.postalCode)}</span></div>` : ''}
        ${company.address ? `<div class="row"><span class="lbl">住所：</span><span class="val">${escapeHtml(company.address)}</span></div>` : ''}
        ${company.tel ? `<div class="row"><span class="lbl">電話：</span><span class="val">${escapeHtml(company.tel)}</span></div>` : ''}
        ${company.email ? `<div class="row"><span class="lbl">メール：</span><span class="val">${escapeHtml(company.email)}</span></div>` : ''}
        ${company.invoiceNumber ? `<div class="row"><span class="lbl">登録番号：</span><span class="val">${escapeHtml(company.invoiceNumber)}</span></div>` : ''}
      </div>
    </div>
  </div>

  <div class="lead">下記の通り、${noun}申し上げます。</div>

  <div class="total-box">
    <div class="label">${amountLabel}${includeTax ? '（税込）' : ''}</div>
    <div class="amount">${yen(netAmount)}</div>
  </div>

  ${
    document.detailMode === 'external'
      ? `<div class="external-note">別紙明細の通り</div>`
      : `<table class="lines">
    <thead>
      <tr>
        <th class="col-content">品目</th>
        <th class="col-qty">数量</th>
        <th class="col-unit">単位</th>
        <th class="col-price">単価</th>
        <th class="col-amount">金額</th>
      </tr>
    </thead>
    <tbody>${renderLines(lines)}</tbody>
  </table>`
  }
  ${hasReduced ? '<div class="reduced-note">※ 軽減税率対象</div>' : ''}

  <div class="summary">
    <div class="row"><span class="label">小計（税抜）</span><span class="num">${yen(document.subtotal)}</span></div>
    ${taxRows}
    ${
      document.withholdingTax > 0
        ? `<div class="row withholding"><span>源泉徴収税</span><span class="num">- ${yen(document.withholdingTax)}</span></div>`
        : ''
    }
    <div class="row total"><span>合計</span><span class="num">${yen(netAmount)}</span></div>
  </div>

  ${document.options.showBankInfo ? renderBankInfo(company) : ''}
  ${
    document.options.showRemarks && document.remarks
      ? `<div class="remarks"><div class="section-title">備考</div>${escapeHtml(document.remarks)}</div>`
      : ''
  }
</body>
</html>`
}

export const DOCUMENT_TITLE_MAP = DOCUMENT_TITLE
