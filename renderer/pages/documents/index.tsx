import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { History } from 'lucide-react'
import {
  DocumentHistoryFilter,
  EMPTY_FILTERS,
  HistoryFilters,
  toDocumentFilter,
} from '../../components/documents/DocumentHistoryFilter'
import { DocumentHistoryTable } from '../../components/documents/DocumentHistoryTable'
import {
  useDeleteDocument,
  useDocuments,
  useGeneratePdf,
  useSearchDocuments,
} from '../../hooks/useDocuments'
import type { DocumentSort } from '../../types'

const DEFAULT_SORT: DocumentSort = { key: 'issueDate', direction: 'desc' }

export default function DocumentsHistoryPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS)
  const deleteMutation = useDeleteDocument()
  const pdfMutation = useGeneratePdf()

  const filter = toDocumentFilter(filters)
  const { data: documents = [], isLoading } = useSearchDocuments(
    filter,
    DEFAULT_SORT
  )
  const { data: allDocuments = [] } = useDocuments(DEFAULT_SORT)

  const handleRowClick = (id: string) => router.push(`/documents/${id}`)

  const handleDuplicate = (id: string) => {
    router.push(`/documents/new?from=${id}`)
  }

  const handleDownloadPdf = async (id: string) => {
    try {
      const { filePath } = await pdfMutation.mutateAsync(id)
      alert(`PDFを生成しました:\n${filePath}`)
    } catch (e) {
      alert(`PDF生成に失敗しました: ${(e as Error).message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この書類を削除しますか？この操作は取り消せません。')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (e) {
      alert(`削除に失敗しました: ${(e as Error).message}`)
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
            {isLoading
              ? '読み込み中...'
              : `${allDocuments.length}件中 ${documents.length}件を表示`}
          </span>
          <span className="text-xs">並び順: 発行日（降順）</span>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-dashed bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-12 text-center">
            <p className="text-sm font-medium">該当する書類がありません</p>
            <p className="mt-1 text-xs text-muted-foreground">
              検索条件を変更するか、リセットしてください。
            </p>
          </div>
        ) : (
          <DocumentHistoryTable
            documents={documents}
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
