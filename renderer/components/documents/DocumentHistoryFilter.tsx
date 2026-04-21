import { Search, X } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { DOCUMENT_TYPE_LABEL, DocumentFilter, DocumentType } from '../../types'

export type DocumentTypeFilter = NonNullable<DocumentFilter['documentType']>

export interface HistoryFilters {
  clientName: string
  startDate: string
  endDate: string
  documentType: DocumentTypeFilter
  minAmount: string
  maxAmount: string
}

export const EMPTY_FILTERS: HistoryFilters = {
  clientName: '',
  startDate: '',
  endDate: '',
  documentType: 'all',
  minAmount: '',
  maxAmount: '',
}

const parseAmount = (value: string): number | undefined => {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export const toDocumentFilter = (f: HistoryFilters): DocumentFilter => ({
  clientName: f.clientName.trim() === '' ? undefined : f.clientName.trim(),
  startDate: f.startDate === '' ? undefined : f.startDate,
  endDate: f.endDate === '' ? undefined : f.endDate,
  documentType: f.documentType,
  minAmount: parseAmount(f.minAmount),
  maxAmount: parseAmount(f.maxAmount),
})

interface Props {
  filters: HistoryFilters
  onChange: (next: HistoryFilters) => void
  onReset: () => void
}

export const DocumentHistoryFilter = ({ filters, onChange, onReset }: Props) => {
  const update = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Search className="h-4 w-4 text-muted-foreground" />
          検索
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
          <X className="h-3.5 w-3.5" />
          リセット
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="f-client">取引先名</Label>
          <Input
            id="f-client"
            placeholder="部分一致"
            value={filters.clientName}
            onChange={(e) => update('clientName', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>期間</Label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => update('startDate', e.target.value)}
            />
            <span className="text-muted-foreground">〜</span>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => update('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-type">書類種別</Label>
          <Select
            value={filters.documentType}
            onValueChange={(v) => update('documentType', v as DocumentTypeFilter)}
          >
            <SelectTrigger id="f-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {DOCUMENT_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
          <Label>金額範囲（円）</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="下限"
              value={filters.minAmount}
              onChange={(e) => update('minAmount', e.target.value)}
            />
            <span className="text-muted-foreground">〜</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="上限"
              value={filters.maxAmount}
              onChange={(e) => update('maxAmount', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
