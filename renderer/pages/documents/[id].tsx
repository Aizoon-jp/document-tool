import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
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
import { MOCK_DOCUMENT_HISTORY } from '../../components/documents/historyMockData'
import { MOCK_CLIENTS, MOCK_STAMPS } from '../../components/documents/mockData'
import { formatCurrency } from '../../components/documents/utils'
import { DocumentFormValues } from '../../components/documents/schema'
import { DOCUMENT_TYPE_LABEL, Document } from '../../types'

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

/** プレビュー用に DocumentFormValues へ変換。明細は totalAmount を元に 1 行だけ組み立てる。 */
const toFormValues = (doc: Document): DocumentFormValues => {
  const subtotalExcl = Math.round(doc.totalAmount / 1.1)
  return {
    documentType: doc.documentType,
    clientId: doc.clientId,
    issueDate: doc.issueDate,
    documentNumber: doc.documentNumber,
    detailMode: doc.detailMode,
    lines: [
      {
        itemId: null,
        content: `${DOCUMENT_TYPE_LABEL[doc.documentType]}業務一式`,
        quantity: 1,
        unit: '式',
        unitPrice: subtotalExcl,
        taxRate: 10,
        isReducedTaxRate: false,
      },
    ],
    externalAmount: doc.detailMode === 'external' ? subtotalExcl : 0,
    options: doc.options,
    stampIds: doc.stampId ? [doc.stampId] : [],
    remarks: doc.remarks ?? '',
  }
}

export default function DocumentDetailPage() {
  const router = useRouter()
  const rawId = router.query.id
  const id = typeof rawId === 'string' ? rawId : ''

  const doc = useMemo<Document | null>(() => {
    if (!id) return null
    return MOCK_DOCUMENT_HISTORY.find((d) => d.id === id) ?? null
  }, [id])

  const client = useMemo(
    () => (doc ? MOCK_CLIENTS.find((c) => c.id === doc.clientId) ?? null : null),
    [doc]
  )

  const previewValues = useMemo(
    () => (doc ? toFormValues(doc) : null),
    [doc]
  )

  const previewStamps = useMemo(
    () =>
      doc && doc.stampId
        ? MOCK_STAMPS.filter((s) => s.id === doc.stampId)
        : [],
    [doc]
  )

  const handleRegeneratePdf = () => {
    alert(`PDF再生成（仮）: ${doc?.documentNumber}`)
  }

  const handleDuplicate = () => {
    if (!doc) return
    router.push(`/documents/new?from=${doc.id}`)
  }

  const handleReissue = () => {
    if (!doc) return
    router.push(`/documents/new?base=${doc.id}`)
  }

  const handleDelete = () => {
    if (!doc) return
    if (window.confirm(`書類「${doc.documentNumber}」を削除しますか？`)) {
      alert('削除（仮）：コンソールに出力しました')
      // eslint-disable-next-line no-console
      console.log('[detail] delete', doc.id)
    }
  }

  if (!doc || !previewValues) {
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
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="mr-1 h-4 w-4" />
              この書類を複製
            </Button>
            <Button variant="outline" onClick={handleReissue}>
              <Pencil className="mr-1 h-4 w-4" />
              編集（再発行）
            </Button>
            <Button onClick={handleRegeneratePdf}>
              <FileDown className="mr-1 h-4 w-4" />
              PDF再生成
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* 左：メタ情報 */}
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
                        送付済み
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        未送付
                      </span>
                    )
                  }
                />
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
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  この書類を削除
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右：プレビュー */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">書類プレビュー</CardTitle>
              </CardHeader>
              <CardContent>
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
  const knownIds = MOCK_DOCUMENT_HISTORY.map((d) => d.id)
  // 存在しないIDアクセスでも「見つかりません」画面を表示できるよう、
  // 代表的なセンチネルを paths に含めておく（Nextron の output:export 制約対応）
  const fallbackIds = ['not-found', 'zzz']
  const ids = Array.from(new Set([...knownIds, ...fallbackIds]))
  return {
    paths: ids.map((id) => ({ params: { id } })),
    fallback: false as const,
  }
}

export const getStaticProps = async () => ({ props: {} })
