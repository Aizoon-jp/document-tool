import { format } from 'date-fns'
import {
  Client,
  Company,
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

const NUMBER_LABEL: Record<DocumentType, string> = {
  invoice: '請求書番号',
  receipt: '領収書番号',
  quote: '見積書番号',
  payment_request: '振込依頼書番号',
  delivery_note: '納品書番号',
}

const NOUN: Record<DocumentType, string> = {
  invoice: '請求',
  receipt: '領収',
  quote: 'お見積り',
  payment_request: 'お振込み',
  delivery_note: '納品',
}

const AMOUNT_LABEL: Record<DocumentType, string> = {
  invoice: 'ご請求金額',
  receipt: '領収金額',
  quote: 'お見積り金額',
  payment_request: 'お振込み金額',
  delivery_note: 'お支払い金額',
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
          <div className="flex-1 pt-2">
            <div className="border-b-2 border-slate-700 pb-1 text-base font-semibold">
              {client ? `${client.name} ${client.honorific}` : '取引先未選択'}
            </div>
            {client?.address && (
              <div className="mt-1 text-[10px] text-slate-600">
                〒{client.postalCode} {client.address}
              </div>
            )}
          </div>
          <div className="relative w-52 text-[10px] text-slate-700">
            <div className="text-right">
              <div>{formatDate(values.issueDate)}</div>
              <div className="font-mono">
                {NUMBER_LABEL[values.documentType]}　{values.documentNumber}
              </div>
            </div>
            <div className="relative mt-3">
              {company ? (
                <>
                  <div className="text-[13px] font-bold text-slate-900">
                    {company.name}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {company.postalCode && <div>〒{company.postalCode}</div>}
                    {company.address && (
                      <div className="flex gap-1">
                        <span className="min-w-[3em] text-slate-500">住所：</span>
                        <span>{company.address}</span>
                      </div>
                    )}
                    {company.tel && (
                      <div className="flex gap-1">
                        <span className="min-w-[3em] text-slate-500">電話：</span>
                        <span>{company.tel}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex gap-1">
                        <span className="min-w-[3em] text-slate-500">メール：</span>
                        <span>{company.email}</span>
                      </div>
                    )}
                    {company.invoiceNumber && (
                      <div className="flex gap-1">
                        <span className="min-w-[3em] text-slate-500">登録番号：</span>
                        <span>{company.invoiceNumber}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-slate-400">
                  会社情報未登録（設定から登録してください）
                </div>
              )}
              {stamps.length > 0 && (
                <div className="pointer-events-none absolute left-[7.5em] top-[-0.4em] flex gap-1">
                  {stamps.map((s) => (
                    <div
                      key={s.id}
                      className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-rose-500 text-center text-[8px] font-medium leading-tight text-rose-600 opacity-80"
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-2 text-[10px] text-slate-600">
          下記の通り、{NOUN[values.documentType]}申し上げます。
        </div>

        <div className="mb-3 overflow-hidden rounded border border-slate-300">
          <div className="bg-blue-600 py-1.5 text-center text-[11px] font-medium tracking-wider text-white">
            {AMOUNT_LABEL[values.documentType]}（税込）
          </div>
          <div className="px-4 py-2 text-right text-xl font-bold text-slate-900">
            {formatCurrency(total)}
          </div>
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
