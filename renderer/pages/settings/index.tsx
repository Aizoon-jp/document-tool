import Head from 'next/head'
import { Building2, Users, Package, Stamp, FileCog } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'

const TABS = [
  { id: 'company', label: '会社基本情報', icon: Building2 },
  { id: 'clients', label: '取引先マスタ', icon: Users },
  { id: 'items', label: '品目マスタ', icon: Package },
  { id: 'stamps', label: '印影管理', icon: Stamp },
  { id: 'documents', label: '書類別設定', icon: FileCog },
] as const

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>設定 — 事務ツール</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
          <p className="text-sm text-muted-foreground">
            マスタデータと共通設定を一元管理します。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Card key={id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
                <CardDescription>Phase 4 で CRUD UI を実装</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  未実装
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
