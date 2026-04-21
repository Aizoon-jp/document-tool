import type {
  Client,
  Company,
  Document,
  DocumentLine,
  DocumentType,
  Stamp,
} from '../../renderer/types'

const DOCUMENT_TITLE: Record<DocumentType, string> = {
  invoice: '請 求 書',
  receipt: '領 収 書',
  quote: '御 見 積 書',
  payment_request: '振 込 依 頼 書',
  delivery_note: '納 品 書',
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

function renderLines(lines: DocumentLine[]): string {
  return lines
    .map(
      (line) => `
    <tr>
      <td class="c">${line.lineNumber}</td>
      <td>${escapeHtml(line.content)}${
        line.isReducedTaxRate ? '<span class="reduced">※</span>' : ''
      }</td>
      <td class="r">${line.quantity}</td>
      <td class="c">${escapeHtml(line.unit)}</td>
      <td class="r">${yen(line.unitPrice)}</td>
      <td class="c">${line.taxRate}%</td>
      <td class="r">${yen(line.subtotalExclTax)}</td>
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
  return `
    <div class="bank">
      <div class="section-title">お振込先</div>
      <div>${escapeHtml(company.bankName)} ${escapeHtml(company.bankBranch ?? '')}</div>
      <div>${type} ${escapeHtml(company.bankAccountNumber ?? '')}</div>
      <div>${escapeHtml(company.bankAccountHolderKana ?? '')}</div>
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
  const hasReduced = lines.some((l) => l.isReducedTaxRate)
  const netAmount = document.totalAmount - document.withholdingTax

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>${title} ${escapeHtml(document.documentNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; font-family: "Noto Sans JP", sans-serif; color: #111; }
  body { padding: 15mm 18mm; width: 210mm; box-sizing: border-box; position: relative; }
  h1 { text-align: center; letter-spacing: 0.3em; font-size: 22pt; margin: 0 0 8mm 0; border-bottom: 2px solid #222; padding-bottom: 3mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
  .client { font-size: 12pt; }
  .client .name { font-size: 16pt; font-weight: bold; border-bottom: 1px solid #666; padding: 2mm 4mm; min-width: 70mm; }
  .company { text-align: right; font-size: 9pt; line-height: 1.6; }
  .company .name { font-size: 12pt; font-weight: bold; margin-bottom: 2mm; }
  .meta { display: flex; gap: 6mm; font-size: 10pt; margin-bottom: 6mm; }
  .meta div { border-bottom: 1px solid #999; padding: 1mm 3mm; }
  .total-box { background: #f3f4f6; padding: 4mm 6mm; margin: 4mm 0 8mm 0; display: flex; justify-content: space-between; align-items: center; }
  .total-box .label { font-size: 12pt; }
  .total-box .amount { font-size: 20pt; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #555; padding: 2mm 3mm; }
  th { background: #e5e7eb; }
  td.c { text-align: center; }
  td.r { text-align: right; }
  .reduced { color: #b45309; font-size: 8pt; margin-left: 2mm; }
  .summary { margin-top: 4mm; display: flex; justify-content: flex-end; }
  .summary table { width: 80mm; }
  .footer { margin-top: 8mm; font-size: 9pt; }
  .section-title { font-weight: bold; margin-bottom: 2mm; border-left: 3px solid #555; padding-left: 3mm; }
  .remarks { margin-top: 6mm; white-space: pre-wrap; font-size: 9pt; border: 1px solid #999; padding: 3mm; }
  .bank { margin-top: 6mm; font-size: 9pt; border: 1px solid #999; padding: 3mm; }
  .stamp { position: absolute; pointer-events: none; }
  .reduced-note { font-size: 8pt; color: #666; margin-top: 2mm; }
</style>
</head>
<body>
  ${renderStamp(stamp, stampImageDataUrl)}
  <h1>${title}</h1>
  <div class="header">
    <div class="client">
      <div class="name">${escapeHtml(client.name)} ${escapeHtml(client.honorific)}</div>
      ${client.postalCode ? `<div>〒${escapeHtml(client.postalCode)}</div>` : ''}
      ${client.address ? `<div>${escapeHtml(client.address)}</div>` : ''}
    </div>
    <div class="company">
      <div class="name">${escapeHtml(company.name)}</div>
      ${company.invoiceNumber ? `<div>登録番号: ${escapeHtml(company.invoiceNumber)}</div>` : ''}
      ${company.postalCode ? `<div>〒${escapeHtml(company.postalCode)}</div>` : ''}
      ${company.address ? `<div>${escapeHtml(company.address)}</div>` : ''}
      ${company.tel ? `<div>TEL: ${escapeHtml(company.tel)}</div>` : ''}
      ${company.email ? `<div>${escapeHtml(company.email)}</div>` : ''}
    </div>
  </div>
  <div class="meta">
    <div>発行日: ${escapeHtml(document.issueDate)}</div>
    <div>番号: ${escapeHtml(document.documentNumber)}</div>
  </div>
  <div class="total-box">
    <div class="label">ご請求金額（税込）</div>
    <div class="amount">${yen(netAmount)}</div>
  </div>
  ${
    document.detailMode === 'external'
      ? ''
      : `<table>
    <thead>
      <tr>
        <th style="width:10mm">#</th>
        <th>内容</th>
        <th style="width:15mm">数量</th>
        <th style="width:12mm">単位</th>
        <th style="width:22mm">単価</th>
        <th style="width:12mm">税率</th>
        <th style="width:26mm">金額（税抜）</th>
      </tr>
    </thead>
    <tbody>${renderLines(lines)}</tbody>
  </table>`
  }
  ${hasReduced ? '<div class="reduced-note">※ 軽減税率対象</div>' : ''}
  <div class="summary">
    <table>
      <tr><th>小計（税抜）</th><td class="r">${yen(document.subtotal)}</td></tr>
      <tr><th>消費税</th><td class="r">${yen(document.taxAmount)}</td></tr>
      <tr><th>合計</th><td class="r">${yen(document.totalAmount)}</td></tr>
      ${
        document.withholdingTax > 0
          ? `<tr><th>源泉徴収税</th><td class="r">-${yen(document.withholdingTax)}</td></tr>
             <tr><th>差引支払額</th><td class="r"><b>${yen(netAmount)}</b></td></tr>`
          : ''
      }
    </table>
  </div>
  ${
    document.options.showRemarks && document.remarks
      ? `<div class="remarks">${escapeHtml(document.remarks)}</div>`
      : ''
  }
  ${document.options.showBankInfo ? renderBankInfo(company) : ''}
</body>
</html>`
}

export const DOCUMENT_TITLE_MAP = DOCUMENT_TITLE
