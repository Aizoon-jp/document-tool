import { format } from 'date-fns'
import {
  Client,
  Company,
  DOCUMENT_TYPE_LABEL,
  DocumentType,
  Stamp,
} from '../../types'
import { DocumentFormValues } from './schema'
import { calcLine, calcWithholdingTax, formatCurrency } from './utils'

interface Props {
  values: DocumentFormValues
  client: Client | null
  company: Company | null
  stamps: Stamp[]
}

const BANK_ACCOUNT_TYPE_LABEL: Record<'ordinary' | 'checking', string> = {
  ordinary: '普通',
  checking: '当座',
}

const formatDate = (iso: string): string => {
  if (!iso) return ''
  try {
    return format(new Date(iso), 'yyyy年M月d日')
  } catch {
    return iso
  }
}

const DOCUMENT_TITLE: Record<DocumentType, string> = {
  invoice: '請 求 書',
  receipt: '領 収 書',
  quote: '見 積 書',
  payment_request: '振込依頼書',
  delivery_note: '納 品 書',
}

export const DocumentPreview = ({ values, client, company, stamps }: Props) => {
  const { lines, detailMode, externalAmount, options } = values

  const lineTotals = lines.map((l) =>
    calcLine(l.quantity, l.unitPrice, l.taxRate, options.includeTax)
  )

  const subtotal =
    detailMode === 'external'
      ? externalAmount
      : lineTotals.reduce((a, b) => a + b.subtotalExclTax, 0)
  const taxAmount =
    detailMode === 'external'
      ? options.includeTax
        ? Math.floor(externalAmount * 0.1)
        : 0
      : lineTotals.reduce((a, b) => a + b.taxAmount, 0)
  const withholdingTax = options.withholdingTax
    ? calcWithholdingTax(subtotal)
    : 0
  const total = subtotal + taxAmount - withholdingTax

  return (
    <div className="aspect-[1/1.414] w-full overflow-hidden rounded-md border bg-white text-[11px] text-slate-900 shadow-inner">
      <div className="relative flex h-full flex-col p-6">
        <h2 className="mb-4 text-center text-2xl font-semibold tracking-[0.4em]">
          {DOCUMENT_TITLE[values.documentType]}
        </h2>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="border-b-2 border-slate-700 pb-1 text-base font-semibold">
              {client ? `${client.name} ${client.honorific}` : '取引先未選択'}
            </div>
            {client?.address && (
              <div className="mt-1 text-[10px] text-slate-600">
                〒{client.postalCode} {client.address}
              </div>
            )}
          </div>
          <div className="relative w-44 text-right text-[10px]">
            <div>発行日：{formatDate(values.issueDate)}</div>
            <div className="font-mono">No. {values.documentNumber}</div>
            <div className="mt-2 border-t border-slate-300 pt-1 text-[10px] text-slate-700">
              {company ? (
                <>
                  <div className="font-medium">{company.name}</div>
                  {(company.postalCode || company.address) && (
                    <div>
                      {company.postalCode && `〒${company.postalCode} `}
                      {company.address}
                    </div>
                  )}
                  {company.tel && <div>TEL: {company.tel}</div>}
                  {company.invoiceNumber && (
                    <div>登録番号: {company.invoiceNumber}</div>
                  )}
                </>
              ) : (
                <div className="text-slate-400">
                  会社情報未登録（設定から登録してください）
                </div>
              )}
            </div>
            {stamps.length > 0 && (
              <div className="pointer-events-none absolute -right-1 bottom-0 flex gap-1">
                {stamps.map((s) => (
                  <div
                    key={s.id}
                    className="flex h-12 w-12 items-center justify-center rounded-sm border-2 border-rose-500 text-center text-[9px] font-medium leading-tight text-rose-600 opacity-80"
                    style={{ transform: 'rotate(-6deg)' }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-2 text-[10px] text-slate-600">
          下記の通り{DOCUMENT_TYPE_LABEL[values.documentType]}申し上げます。
        </div>

        <div className="mb-3 flex items-center justify-between rounded border border-slate-300 bg-slate-50 px-3 py-2">
          <span className="text-sm font-medium">
            ご{values.documentType === 'quote' ? '見積' : '請求'}金額
          </span>
          <span className="text-lg font-semibold">{formatCurrency(total)}</span>
        </div>

        <div className="mb-3 flex-1 overflow-hidden">
          {detailMode === 'external' ? (
            <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-400 text-[11px] text-slate-600">
              別紙明細の通り
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y border-slate-400 bg-slate-100 text-[10px]">
                  <th className="px-2 py-1 text-left font-medium">品目</th>
                  <th className="w-12 px-1 py-1 text-right font-medium">数量</th>
                  <th className="w-10 px-1 py-1 text-center font-medium">単位</th>
                  <th className="w-20 px-1 py-1 text-right font-medium">単価</th>
                  <th className="w-24 px-2 py-1 text-right font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-[10px] text-slate-400"
                    >
                      明細行を追加してください
                    </td>
                  </tr>
                )}
                {lines.map((l, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="px-2 py-1">
                      {l.content || '（未入力）'}
                      {l.isReducedTaxRate && (
                        <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-800">
                          軽減8%
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-1 text-right">{l.quantity || ''}</td>
                    <td className="px-1 py-1 text-center text-[10px] text-slate-600">
                      {l.unit}
                    </td>
                    <td className="px-1 py-1 text-right">
                      {l.unitPrice ? formatCurrency(l.unitPrice) : ''}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {formatCurrency(lineTotals[idx]?.subtotalExclTax ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ml-auto w-56 space-y-1 border-t border-slate-400 pt-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-600">小計</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {options.includeTax && (
            <div className="flex justify-between">
              <span className="text-slate-600">消費税</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {options.withholdingTax && (
            <div className="flex justify-between text-rose-700">
              <span>源泉徴収税（10.21%）</span>
              <span>- {formatCurrency(withholdingTax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-400 pt-1 font-semibold">
            <span>合計</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {options.showBankInfo && (
          <div className="mt-3 rounded border border-slate-300 bg-slate-50 p-2 text-[10px]">
            <div className="mb-0.5 font-medium">お振込先</div>
            {company?.bankName ? (
              <>
                <div>
                  {company.bankName}
                  {company.bankBranch && ` ${company.bankBranch}`}
                  {company.bankAccountType &&
                    ` ${BANK_ACCOUNT_TYPE_LABEL[company.bankAccountType as 'ordinary' | 'checking'] ?? ''}`}
                  {company.bankAccountNumber && ` ${company.bankAccountNumber}`}
                </div>
                {company.bankAccountHolderKana && (
                  <div>名義：{company.bankAccountHolderKana}</div>
                )}
              </>
            ) : (
              <div className="text-slate-400">
                振込先未登録（設定から登録してください）
              </div>
            )}
          </div>
        )}

        {options.showRemarks && values.remarks && (
          <div className="mt-2 rounded border border-slate-200 p-2 text-[10px] text-slate-700">
            <div className="mb-0.5 font-medium">備考</div>
            <div className="whitespace-pre-wrap">{values.remarks}</div>
          </div>
        )}

      </div>
    </div>
  )
}
