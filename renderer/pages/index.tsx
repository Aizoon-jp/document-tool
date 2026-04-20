import Head from 'next/head'
import { useRouter } from 'next/router'
import { FilePlus2, History, Receipt, Truck, Wallet } from 'lucide-react'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { DocumentType, DOCUMENT_TYPE_LABEL } from '../types'

const QUICK_CREATE: { type: DocumentType; icon: typeof Receipt }[] = [
  { type: 'invoice', icon: Receipt },
  { type: 'receipt', icon: Receipt },
  { type: 'quote', icon: FilePlus2 },
  { type: 'payment_request', icon: Wallet },
  { type: 'delivery_note', icon: Truck },
]

export default function DashboardPage() {
  const router = useRouter()

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {QUICK_CREATE.map(({ type, icon: Icon }) => (
              <Card key={type} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">
                      {DOCUMENT_TYPE_LABEL[type]}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/documents/new?type=${type}`)}
                  >
                    新規作成
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">最近発行した書類</CardTitle>
              </div>
              <CardDescription>
                Phase 5 以降、実データが表示されます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                まだ書類が発行されていません
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
