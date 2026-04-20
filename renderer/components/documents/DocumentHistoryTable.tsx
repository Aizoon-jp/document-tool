import { format } from 'date-fns'
import { Copy, FileDown, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { DOCUMENT_TYPE_LABEL, Document } from '../../types'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const formatDate = (iso: string) => format(new Date(iso), 'yyyy/MM/dd')

interface Props {
  documents: Document[]
  onRowClick: (id: string) => void
  onDuplicate: (id: string) => void
  onDownloadPdf: (id: string) => void
  onDelete: (id: string) => void
}

export const DocumentHistoryTable = ({
  documents,
  onRowClick,
  onDuplicate,
  onDownloadPdf,
  onDelete,
}: Props) => {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[110px] whitespace-nowrap">発行日</TableHead>
            <TableHead className="w-[96px] whitespace-nowrap">書類種別</TableHead>
            <TableHead className="whitespace-nowrap">取引先</TableHead>
            <TableHead className="w-[160px] whitespace-nowrap">書類番号</TableHead>
            <TableHead className="w-[120px] whitespace-nowrap text-right">金額</TableHead>
            <TableHead className="w-[48px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc.id}
              onClick={() => onRowClick(doc.id)}
              className="cursor-pointer"
            >
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(doc.issueDate)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {DOCUMENT_TYPE_LABEL[doc.documentType]}
              </TableCell>
              <TableCell className="whitespace-nowrap font-medium">
                {doc.clientName}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {doc.documentNumber}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                {currencyFormatter.format(doc.totalAmount)}
              </TableCell>
              <TableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="操作メニュー"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onDuplicate(doc.id)}>
                      <Copy className="h-4 w-4" />
                      複製
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDownloadPdf(doc.id)}>
                      <FileDown className="h-4 w-4" />
                      PDF再ダウンロード
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => onDelete(doc.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
