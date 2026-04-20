import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'

export default function DocumentDetailPage() {
  const router = useRouter()
  const { id } = router.query

  return (
    <>
      <Head>
        <title>書類詳細 — 事務ツール</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            書類詳細 #{typeof id === 'string' ? id : '...'}
          </h1>
          <p className="text-sm text-muted-foreground">
            書類内容の確認・PDF再生成・再発行を行います。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">書類プレビュー</CardTitle>
            <CardDescription>Phase 4 で実データを表示します。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[1/1.414] w-full rounded-md border border-dashed bg-muted/30" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export const getStaticPaths = async () => ({
  paths: [],
  fallback: 'blocking' as const,
})

export const getStaticProps = async () => ({ props: {} })
