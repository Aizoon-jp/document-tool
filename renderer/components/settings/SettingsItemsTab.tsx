import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Switch } from '../ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { MOCK_ITEMS } from '../documents/mockData'
import type { Item, TaxRate } from '../../types'

const itemSchema = z.object({
  name: z.string().min(1, '品目名は必須です'),
  unitPrice: z.coerce.number().min(0, '0以上'),
  unit: z.string(),
  taxRate: z.coerce.number().refine((v) => v === 10 || v === 8 || v === 0, {
    message: '税率は10/8/0のいずれか',
  }),
  isReducedTaxRate: z.boolean(),
  defaultQuantity: z.coerce.number().min(0),
  notes: z.string(),
})

type ItemFormValues = z.infer<typeof itemSchema>

const toFormValues = (i: Item | null): ItemFormValues => ({
  name: i?.name ?? '',
  unitPrice: i?.unitPrice ?? 0,
  unit: i?.unit ?? '式',
  taxRate: i?.taxRate ?? 10,
  isReducedTaxRate: i?.isReducedTaxRate ?? false,
  defaultQuantity: i?.defaultQuantity ?? 1,
  notes: i?.notes ?? '',
})

const formatYen = (n: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(n)

export const SettingsItemsTab = () => {
  const [items, setItems] = useState<Item[]>(MOCK_ITEMS)
  const [editing, setEditing] = useState<Item | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openNew = () => {
    setEditing(null)
    setIsOpen(true)
  }

  const openEdit = (i: Item) => {
    setEditing(i)
    setIsOpen(true)
  }

  const handleDelete = (id: string) => {
    if (!confirm('この品目を削除しますか？')) return
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          登録品目：{items.length}件
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          新規追加
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>品目名</TableHead>
              <TableHead className="text-right">単価</TableHead>
              <TableHead>単位</TableHead>
              <TableHead>税率</TableHead>
              <TableHead>軽減</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatYen(i.unitPrice)}
                </TableCell>
                <TableCell>{i.unit}</TableCell>
                <TableCell>{i.taxRate}%</TableCell>
                <TableCell>
                  {i.isReducedTaxRate ? (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      軽減
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(i)}
                      aria-label="編集"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(i.id)}
                      aria-label="削除"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ItemDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        target={editing}
      />
    </div>
  )
}

type DialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  target: Item | null
}

const ItemDialog = ({ open, onOpenChange, target }: DialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: toFormValues(target),
  })

  const taxRate = watch('taxRate')
  const isReduced = watch('isReducedTaxRate')

  const handleOpenChange = (v: boolean) => {
    if (v) reset(toFormValues(target))
    onOpenChange(v)
  }

  const onSubmit = (values: ItemFormValues) => {
    // eslint-disable-next-line no-console
    console.log('[settings/items] save', { id: target?.id, values })
    alert(`品目を${target ? '更新' : '追加'}しました（ダミー動作）`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target ? '品目を編集' : '品目を追加'}</DialogTitle>
          <DialogDescription>
            書類明細で呼び出せる定型品目
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              品目名<span className="ml-1 text-destructive">*</span>
            </Label>
            <Input {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>単価</Label>
            <Input type="number" min={0} {...register('unitPrice')} />
            {errors.unitPrice && (
              <p className="text-xs text-destructive">
                {errors.unitPrice.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>単位</Label>
            <Input {...register('unit')} placeholder="式 / 個 / 時間 等" />
          </div>
          <div className="space-y-1.5">
            <Label>税率</Label>
            <Select
              value={String(taxRate)}
              onValueChange={(v) =>
                setValue('taxRate', Number(v) as TaxRate, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="8">8%</SelectItem>
                <SelectItem value="0">0%（非課税）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>既定数量</Label>
            <Input type="number" min={0} {...register('defaultQuantity')} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <div>
              <Label>軽減税率対象</Label>
              <p className="text-xs text-muted-foreground">
                食品等の軽減税率品目にマーク
              </p>
            </div>
            <Switch
              checked={isReduced}
              onCheckedChange={(v) =>
                setValue('isReducedTaxRate', v, { shouldDirty: true })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>備考</Label>
            <Textarea {...register('notes')} rows={2} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
