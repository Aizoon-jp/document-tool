import { useRouter } from 'next/router'
import { FileText } from 'lucide-react'
import { DOCUMENT_TYPE_LABEL, DocumentType } from '../types'
import { cn } from '../lib/utils'

const QUICK_TYPES: DocumentType[] = ['invoice', 'receipt', 'quote']

export const Header = () => {
  const router = useRouter()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{currentPageLabel(router.pathname)}</span>
      </div>
      <div className="flex items-center gap-2">
        {QUICK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => router.push(`/documents/new?type=${type}`)}
            className={cn(
              'rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium',
              'transition-colors hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {DOCUMENT_TYPE_LABEL[type]}作成
          </button>
        ))}
      </div>
    </header>
  )
}

const currentPageLabel = (pathname: string): string => {
  if (pathname === '/') return 'ダッシュボード'
  if (pathname.startsWith('/documents/new')) return '書類作成'
  if (pathname === '/documents/[id]') return '書類詳細'
  if (pathname.startsWith('/documents')) return '書類履歴'
  if (pathname.startsWith('/settings')) return '設定'
  return '事務ツール'
}
