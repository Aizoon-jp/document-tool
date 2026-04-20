import Head from 'next/head'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'

export default function DocumentsHistoryPage() {
  return (
    <>
      <Head>
        <title>書類履歴 — 事務ツール</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">書類履歴</h1>
          <p className="text-sm text-muted-foreground">
            発行済み書類の検索・再発行・複製を行います。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">一覧</CardTitle>
            <CardDescription>Phase 4 でテーブル UI を実装します。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              書類履歴がまだありません
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
