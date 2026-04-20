import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'ダッシュボード',
    icon: LayoutDashboard,
    match: (p) => p === '/',
  },
  {
    href: '/documents/new',
    label: '書類作成',
    icon: FilePlus2,
    match: (p) => p.startsWith('/documents/new'),
  },
  {
    href: '/documents',
    label: '書類履歴',
    icon: History,
    match: (p) =>
      p === '/documents' || (p.startsWith('/documents/') && p !== '/documents/new'),
  },
  {
    href: '/settings',
    label: '設定',
    icon: Settings,
    match: (p) => p.startsWith('/settings'),
  },
]

export const Sidebar = () => {
  const router = useRouter()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-base font-semibold">事務ツール</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(router.pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        v0.1.0 — ローカル版
      </div>
    </aside>
  )
}
