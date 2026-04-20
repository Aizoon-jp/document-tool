import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { DocumentType, DOCUMENT_TYPE_LABEL } from '../../types'

const isDocumentType = (value: unknown): value is DocumentType =>
  typeof value === 'string' && value in DOCUMENT_TYPE_LABEL

export default function NewDocumentPage() {
  const router = useRouter()
  const rawType = router.query.type
  const type = isDocumentType(rawType) ? rawType : 'invoice'

  return (
    <>
      <Head>
        <title>書類作成 — 事務ツール</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            書類作成：{DOCUMENT_TYPE_LABEL[type]}
          </h1>
          <p className="text-sm text-muted-foreground">
            取引先・明細・オプションを入力して書類を発行します。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">入力</CardTitle>
              <CardDescription>Phase 4 でフォームを実装します。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                取引先・品目・オプション入力フォーム（実装予定）
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">プレビュー</CardTitle>
              <CardDescription>右ペインに書類プレビューを表示</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[1/1.414] w-full rounded-md border border-dashed bg-muted/30" />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
