import Head from 'next/head'
import { useRouter } from 'next/router'
import { format } from 'date-fns'
import {
  FileText,
  History,
  Receipt,
  ScrollText,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { DOCUMENT_TYPE_LABEL, DocumentType } from '../types'
import {
  useMonthlySummary,
  useRecentDocuments,
} from '../hooks/useDocuments'

const QUICK_CREATE: { type: DocumentType; icon: LucideIcon }[] = [
  { type: 'invoice', icon: FileText },
  { type: 'receipt', icon: Receipt },
  { type: 'quote', icon: ScrollText },
  { type: 'payment_request', icon: Wallet },
  { type: 'delivery_note', icon: Truck },
]

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const formatDate = (isoDate: string): string =>
  format(new Date(isoDate), 'yyyy/MM/dd')
const formatCurrency = (amount: number): string =>
  currencyFormatter.format(amount)

const currentYearMonth = (): string => format(new Date(), 'yyyy-MM')

export default function DashboardPage() {
  const router = useRouter()
  const currentMonthLabel = format(new Date(), 'yyyy年M月')
  const yearMonth = currentYearMonth()

  const { data: recent = [], isLoading: isRecentLoading } =
    useRecentDocuments(5)
  const { data: summary, isLoading: isSummaryLoading } =
    useMonthlySummary(yearMonth)

  return (
    <>
      <Head>
        <title>ダッシュボード — 事務ツール</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            最近の書類と、書類種別ごとのクイック作成が利用できます。
          </p>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            クイック作成
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {QUICK_CREATE.map(({ type, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => router.push(`/documents/new?type=${type}`)}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-primary hover:bg-accent"
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">
                  {DOCUMENT_TYPE_LABEL[type]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">最近発行した書類</CardTitle>
              </div>
              <CardDescription>直近5件を表示</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isRecentLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  読み込み中...
                </div>
              ) : recent.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  書類がまだ発行されていません
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">発行日</th>
                      <th className="px-4 py-2 text-left font-medium">書類種別</th>
                      <th className="px-4 py-2 text-left font-medium">取引先</th>
                      <th className="px-4 py-2 text-left font-medium">書類番号</th>
                      <th className="px-4 py-2 text-right font-medium">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => router.push(`/documents/${doc.id}`)}
                        className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-accent/50"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(doc.issueDate)}
                        </td>
                        <td className="px-4 py-3">
                          {DOCUMENT_TYPE_LABEL[doc.documentType]}
                        </td>
                        <td className="px-4 py-3">{doc.clientName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {doc.documentNumber}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(doc.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">今月の発行件数</CardTitle>
              <CardDescription>{currentMonthLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSummaryLoading || !summary ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : (
                <>
                  <div>
                    <div className="text-3xl font-semibold">
                      {summary.totalCount}
                    </div>
                    <div className="text-xs text-muted-foreground">件発行</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    {(Object.keys(summary.breakdown) as DocumentType[]).map(
                      (type) => (
                        <div
                          key={type}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {DOCUMENT_TYPE_LABEL[type]}
                          </span>
                          <span className="font-medium">
                            {summary.breakdown[type]}件
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/documents')}
          >
            書類履歴をすべて見る
          </Button>
        </div>
      </div>
    </>
  )
}
