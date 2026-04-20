import Head from 'next/head'
import { useRouter } from 'next/router'
import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import {
  DocumentHistoryFilter,
  EMPTY_FILTERS,
  HistoryFilters,
  toDocumentFilter,
} from '../../components/documents/DocumentHistoryFilter'
import { DocumentHistoryTable } from '../../components/documents/DocumentHistoryTable'
import { MOCK_DOCUMENT_HISTORY } from '../../components/documents/historyMockData'
import { MOCK_CLIENTS } from '../../components/documents/mockData'
import { Document, DocumentFilter } from '../../types'

const resolveClientName = (clientId: string, fallback: string): string => {
  const client = MOCK_CLIENTS.find((c) => c.id === clientId)
  return client?.name ?? fallback
}

const applyFilters = (docs: Document[], f: DocumentFilter): Document[] => {
  const name = f.clientName?.trim().toLowerCase() ?? ''
  return docs.filter((doc) => {
    if (name && !doc.clientName.toLowerCase().includes(name)) return false
    if (f.startDate && doc.issueDate < f.startDate) return false
    if (f.endDate && doc.issueDate > f.endDate) return false
    if (f.documentType && f.documentType !== 'all' && doc.documentType !== f.documentType) {
      return false
    }
    if (f.minAmount !== undefined && doc.totalAmount < f.minAmount) return false
    if (f.maxAmount !== undefined && doc.totalAmount > f.maxAmount) return false
    return true
  })
}

export default function DocumentsHistoryPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS)

  const allDocuments = useMemo<Document[]>(
    () =>
      MOCK_DOCUMENT_HISTORY.map((doc) => ({
        ...doc,
        clientName: resolveClientName(doc.clientId, doc.clientName),
      })),
    []
  )

  const filtered = useMemo(() => {
    const result = applyFilters(allDocuments, toDocumentFilter(filters))
    // 発行日降順
    return [...result].sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  }, [allDocuments, filters])

  const handleRowClick = (id: string) => router.push(`/documents/${id}`)
  const handleDuplicate = (id: string) => router.push(`/documents/new?from=${id}`)
  const handleDownloadPdf = (id: string) => {
    // TODO: IPC 実装フェーズで置き換え
    console.log('[history] download pdf', id)
  }
  const handleDelete = (id: string) => {
    // 将来 AlertDialog に差し替え予定
    if (window.confirm('この書類を削除しますか？この操作は取り消せません。')) {
      console.log('[history] delete', id)
    }
  }

  return (
    <>
      <Head>
        <title>書類履歴 — 事務ツール</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">書類履歴</h1>
            <p className="text-sm text-muted-foreground">
              発行済み書類の検索・再発行・複製を行います。
            </p>
          </div>
        </div>

        <DocumentHistoryFilter
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {allDocuments.length}件中 {filtered.length}件を表示
          </span>
          <span className="text-xs">並び順: 発行日（降順）</span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-12 text-center">
            <p className="text-sm font-medium">該当する書類がありません</p>
            <p className="mt-1 text-xs text-muted-foreground">
              検索条件を変更するか、リセットしてください。
            </p>
          </div>
        ) : (
          <DocumentHistoryTable
            documents={filtered}
            onRowClick={handleRowClick}
            onDuplicate={handleDuplicate}
            onDownloadPdf={handleDownloadPdf}
            onDelete={handleDelete}
          />
        )}
      </div>
    </>
  )
}
