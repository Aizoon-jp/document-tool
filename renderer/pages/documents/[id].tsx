import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Copy,
  FileDown,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { DocumentPreview } from '../../components/documents/DocumentPreview'
import { formatCurrency } from '../../components/documents/utils'
import { DocumentFormValues } from '../../components/documents/schema'
import {
  DOCUMENT_TYPE_LABEL,
  Document,
  DocumentLine,
} from '../../types'
import { useClients } from '../../hooks/useClients'
import { useStamps } from '../../hooks/useStamps'
import {
  useDeleteDocument,
  useDocument,
  useDocumentLines,
  useDuplicateDocument,
  useGeneratePdf,
} from '../../hooks/useDocuments'

const formatIssueDate = (iso: string): string => {
  try {
    return format(parseISO(iso), 'yyyy/MM/dd')
  } catch {
    return iso
  }
}

const formatCreatedAt = (iso: string): string => {
  try {
    return format(parseISO(iso), 'yyyy/MM/dd HH:mm')
  } catch {
    return iso
  }
}

const toFormValues = (
  doc: Document,
  lines: DocumentLine[]
): DocumentFormValues => ({
  documentType: doc.documentType,
  clientId: doc.clientId,
  issueDate: doc.issueDate,
  documentNumber: doc.documentNumber,
  detailMode: doc.detailMode,
  lines:
    lines.length > 0
      ? lines.map((l) => ({
          itemId: null,
          content: l.content,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          isReducedTaxRate: l.isReducedTaxRate,
        }))
      : [
          {
            itemId: null,
            content: `${DOCUMENT_TYPE_LABEL[doc.documentType]}業務一式`,
            quantity: 1,
            unit: '式',
            unitPrice: doc.subtotal,
            taxRate: 10,
            isReducedTaxRate: false,
          },
        ],
  externalAmount: doc.detailMode === 'external' ? doc.subtotal : 0,
  options: doc.options,
  stampIds: doc.stampId ? [doc.stampId] : [],
  remarks: doc.remarks ?? '',
})

/**
 * Extract the document UUID from the current URL pathname.
 *
 * `getStaticPaths` only emits `/documents/placeholder/index.html`, so
 * `router.query.id` is always `'placeholder'` after hydration. The
 * Electron main process serves that same HTML for any
 * `/documents/{uuid}/` URL (SPA fallback), so the real UUID lives in
 * `window.location.pathname`.
 */
const extractIdFromPathname = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1] ?? ''
  return last === 'placeholder' ? '' : last
}

export default function DocumentDetailPage() {
  const router = useRouter()
  const [id, setId] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const fromPath = extractIdFromPathname(window.location.pathname)
    if (fromPath) {
      setId(fromPath)
      return
    }
    // Fallback: CSR navigation via router.push keeps query.id correct.
    const rawId = router.query.id
    if (typeof rawId === 'string' && rawId !== 'placeholder') {
      setId(rawId)
    }
  }, [router.query.id, router.asPath])

  const { data: doc, isLoading: isDocLoading, error } = useDocument(id)
  const { data: lines = [] } = useDocumentLines(id)
  const { data: clients = [] } = useClients()
  const { data: stamps = [] } = useStamps()

  const deleteMutation = useDeleteDocument()
  const duplicateMutation = useDuplicateDocument()
  const pdfMutation = useGeneratePdf()

  const client = useMemo(
    () => (doc ? clients.find((c) => c.id === doc.clientId) ?? null : null),
    [doc, clients]
  )

  const previewValues = useMemo(
    () => (doc ? toFormValues(doc, lines) : null),
    [doc, lines]
  )

  const previewStamps = useMemo(
    () =>
      doc && doc.stampId ? stamps.filter((s) => s.id === doc.stampId) : [],
    [doc, stamps]
  )

  const handleRegeneratePdf = async () => {
    if (!doc) return
    try {
      await pdfMutation.mutateAsync(doc.id)
      alert(`PDFを再生成しました: ${doc.documentNumber}`)
    } catch (e) {
      alert(`PDF生成に失敗しました: ${(e as Error).message}`)
    }
  }

  const handleDuplicate = () => {
    if (!doc) return
    router.push(`/documents/new?from=${doc.id}`)
  }

  const handleReissue = () => {
    if (!doc) return
    router.push(`/documents/new?base=${doc.id}`)
  }

  const handleDelete = async () => {
    if (!doc) return
    if (!confirm(`書類「${doc.documentNumber}」を削除しますか？`)) return
    try {
      await deleteMutation.mutateAsync(doc.id)
      router.push('/documents')
    } catch (e) {
      alert(`削除に失敗しました: ${(e as Error).message}`)
    }
  }

  if (!id || isDocLoading) {
    return (
      <>
        <Head>
          <title>読み込み中 — 事務ツール</title>
        </Head>
        <div className="py-16 text-center text-sm text-muted-foreground">
          読み込み中...
        </div>
      </>
    )
  }

  if (!doc || !previewValues || error) {
    return (
      <>
        <Head>
          <title>書類が見つかりません — 事務ツール</title>
        </Head>
        <div className="mx-auto max-w-xl py-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">書類が見つかりません</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                指定された書類ID「{id || '（未指定）'}」は存在しないか、削除された可能性があります。
              </p>
              <Button asChild variant="outline">
                <Link href="/documents">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  履歴に戻る
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const isBusy =
    deleteMutation.isPending ||
    duplicateMutation.isPending ||
    pdfMutation.isPending

  return (
    <>
      <Head>
        <title>
          {doc.documentNumber} — {DOCUMENT_TYPE_LABEL[doc.documentType]} — 事務ツール
        </title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <FileText className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {DOCUMENT_TYPE_LABEL[doc.documentType]}　{doc.documentNumber}
              </h1>
              <p className="text-sm text-muted-foreground">
                発行日 {formatIssueDate(doc.issueDate)} ／ {doc.clientName}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="ghost">
              <Link href="/documents">
                <ArrowLeft className="mr-1 h-4 w-4" />
                履歴に戻る
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={isBusy}
            >
              <Copy className="mr-1 h-4 w-4" />
              {duplicateMutation.isPending ? '複製中...' : 'この書類を複製'}
            </Button>
            <Button variant="outline" onClick={handleReissue}>
              <Pencil className="mr-1 h-4 w-4" />
              編集（再発行）
            </Button>
            <Button onClick={handleRegeneratePdf} disabled={isBusy}>
              <FileDown className="mr-1 h-4 w-4" />
              {pdfMutation.isPending ? '生成中...' : 'PDF再生成'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">書類情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="書類種別" value={DOCUMENT_TYPE_LABEL[doc.documentType]} />
                <InfoRow
                  label="書類番号"
                  value={<span className="font-mono">{doc.documentNumber}</span>}
                />
                <InfoRow label="発行日" value={formatIssueDate(doc.issueDate)} />
                <InfoRow
                  label="取引先"
                  value={client ? `${client.name} ${client.honorific}` : doc.clientName}
                />
                <Separator />
                <InfoRow
                  label="合計金額"
                  value={
                    <span className="text-base font-semibold">
                      {formatCurrency(doc.totalAmount)}
                    </span>
                  }
                />
                <InfoRow label="小計" value={formatCurrency(doc.subtotal)} />
                <InfoRow label="消費税" value={formatCurrency(doc.taxAmount)} />
                {doc.withholdingTax > 0 && (
                  <InfoRow
                    label="源泉徴収税"
                    value={`- ${formatCurrency(doc.withholdingTax)}`}
                  />
                )}
                <Separator />
                <InfoRow
                  label="送付状態"
                  value={
                    doc.pdfFilePath ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        PDF生成済み
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        PDF未生成
                      </span>
                    )
                  }
                />
                {doc.pdfFilePath && (
                  <InfoRow
                    label="PDFパス"
                    value={
                      <span className="font-mono text-xs break-all">
                        {doc.pdfFilePath}
                      </span>
                    }
                  />
                )}
                <InfoRow label="作成日時" value={formatCreatedAt(doc.createdAt)} />
                <InfoRow label="更新日時" value={formatCreatedAt(doc.updatedAt)} />
                {doc.remarks && (
                  <>
                    <Separator />
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">備考</div>
                      <p className="whitespace-pre-wrap text-sm">{doc.remarks}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive">
                  危険な操作
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={isBusy}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {deleteMutation.isPending ? '削除中...' : 'この書類を削除'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <CardTitle className="text-base">書類プレビュー</CardTitle>
                <DocumentPreview
                  values={previewValues}
                  client={client}
                  stamps={previewStamps}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

const InfoRow = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-right text-sm">{value}</span>
  </div>
)

export const getStaticPaths = async () => {
  return {
    paths: [{ params: { id: 'placeholder' } }],
    fallback: false as const,
  }
}

export const getStaticProps = async () => ({ props: {} })
