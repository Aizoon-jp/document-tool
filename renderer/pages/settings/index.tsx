import Head from 'next/head'
import { Building2, FileCog, HardDrive, Package, Stamp, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { SettingsCompanyTab } from '../../components/settings/SettingsCompanyTab'
import { SettingsClientsTab } from '../../components/settings/SettingsClientsTab'
import { SettingsItemsTab } from '../../components/settings/SettingsItemsTab'
import { SettingsStampsTab } from '../../components/settings/SettingsStampsTab'
import { SettingsDocumentTypesTab } from '../../components/settings/SettingsDocumentTypesTab'
import { SettingsDataTab } from '../../components/settings/SettingsDataTab'

const TABS = [
  { id: 'company', label: '会社基本情報', icon: Building2 },
  { id: 'clients', label: '取引先マスタ', icon: Users },
  { id: 'items', label: '品目マスタ', icon: Package },
  { id: 'stamps', label: '印影管理', icon: Stamp },
  { id: 'document-settings', label: '書類別設定', icon: FileCog },
  { id: 'data', label: 'データ', icon: HardDrive },
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

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="company">
            <SettingsCompanyTab />
          </TabsContent>
          <TabsContent value="clients">
            <SettingsClientsTab />
          </TabsContent>
          <TabsContent value="items">
            <SettingsItemsTab />
          </TabsContent>
          <TabsContent value="stamps">
            <SettingsStampsTab />
          </TabsContent>
          <TabsContent value="document-settings">
            <SettingsDocumentTypesTab />
          </TabsContent>
          <TabsContent value="data">
            <SettingsDataTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
