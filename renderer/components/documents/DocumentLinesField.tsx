import { Trash2, Plus } from 'lucide-react'
import {
  Control,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Item } from '../../types'
import { DocumentFormValues } from './schema'
import { calcLine, formatCurrency } from './utils'

interface Props {
  control: Control<DocumentFormValues>
  items: Item[]
}

export const DocumentLinesField = ({ control, items }: Props) => {
  const { setValue } = useFormContext<DocumentFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const watched = useWatch({ control, name: 'lines' })
  const includeTax = useWatch({ control, name: 'options.includeTax' })

  const handlePickItem = (idx: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setValue(`lines.${idx}.itemId`, item.id, { shouldDirty: true })
    setValue(`lines.${idx}.content`, item.name, { shouldDirty: true })
    setValue(`lines.${idx}.unit`, item.unit, { shouldDirty: true })
    setValue(`lines.${idx}.unitPrice`, item.unitPrice, { shouldDirty: true })
    setValue(`lines.${idx}.taxRate`, item.taxRate, { shouldDirty: true })
    setValue(`lines.${idx}.isReducedTaxRate`, item.isReducedTaxRate, {
      shouldDirty: true,
    })
    setValue(`lines.${idx}.quantity`, item.defaultQuantity, {
      shouldDirty: true,
    })
  }

  const addLine = () =>
    append({
      itemId: null,
      content: '',
      quantity: 1,
      unit: '式',
      unitPrice: 0,
      taxRate: 10,
      isReducedTaxRate: false,
    })

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_60px_100px_110px_32px] gap-2 px-1 text-xs text-muted-foreground">
        <span>品目</span>
        <span className="text-right">数量</span>
        <span className="text-center">単位</span>
        <span className="text-right">単価</span>
        <span className="text-right">金額</span>
        <span />
      </div>

      {fields.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          明細行がありません。下のボタンから追加してください。
        </div>
      )}

      {fields.map((f, idx) => {
        const line = watched?.[idx]
        const lineTotal = line
          ? calcLine(line.quantity, line.unitPrice, line.taxRate, includeTax)
              .subtotalExclTax
          : 0
        return (
          <div
            key={f.id}
            className="grid grid-cols-[1fr_80px_60px_100px_110px_32px] items-start gap-2"
          >
            <div className="space-y-1">
              <Select
                value={line?.itemId ?? ''}
                onValueChange={(v) => handlePickItem(idx, v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="品目マスタから選択" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}（{formatCurrency(i.unitPrice)}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-9"
                placeholder="品目名を直接入力"
                {...control.register(`lines.${idx}.content`)}
              />
            </div>
            <Input
              className="h-9 text-right"
              type="number"
              step="1"
              {...control.register(`lines.${idx}.quantity`)}
            />
            <Input
              className="h-9 text-center"
              {...control.register(`lines.${idx}.unit`)}
            />
            <Input
              className="h-9 text-right"
              type="number"
              step="1"
              {...control.register(`lines.${idx}.unitPrice`)}
            />
            <div className="flex h-9 items-center justify-end rounded-md border bg-muted/40 px-2 text-sm">
              {formatCurrency(lineTotal)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => remove(idx)}
              aria-label="明細行を削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addLine}
        className="w-full"
      >
        <Plus className="mr-1 h-4 w-4" />
        明細行を追加
      </Button>
    </div>
  )
}
