import Head from 'next/head'
import Link from 'next/link'
import { Button } from '../components/ui/button'

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>404 — 事務ツール</title>
      </Head>
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-6xl font-bold text-muted-foreground">404</p>
        <p className="text-sm text-muted-foreground">
          ページが見つかりませんでした
        </p>
        <Button asChild>
          <Link href="/">ダッシュボードへ戻る</Link>
        </Button>
      </div>
    </>
  )
}
