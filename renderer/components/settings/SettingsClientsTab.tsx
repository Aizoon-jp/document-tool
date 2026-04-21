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
import {
  useClients,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
} from '../../hooks/useClients'
import type {
  Client,
  ClientInput,
  Honorific,
  TaxCategory,
} from '../../types'

const clientSchema = z.object({
  name: z.string().min(1, '取引先名は必須です'),
  honorific: z.enum(['御中', '様']),
  postalCode: z.string(),
  address: z.string(),
  tel: z.string(),
  contactPerson: z.string(),
  contactDepartment: z.string(),
  paymentTerms: z.string(),
  defaultTaxCategory: z.enum(['taxable_10', 'taxable_8', 'tax_free']),
  notes: z.string(),
})

type ClientFormValues = z.infer<typeof clientSchema>

const toFormValues = (c: Client | null): ClientFormValues => ({
  name: c?.name ?? '',
  honorific: (c?.honorific ?? '御中') as Honorific,
  postalCode: c?.postalCode ?? '',
  address: c?.address ?? '',
  tel: c?.tel ?? '',
  contactPerson: c?.contactPerson ?? '',
  contactDepartment: c?.contactDepartment ?? '',
  paymentTerms: c?.paymentTerms ?? '',
  defaultTaxCategory: (c?.defaultTaxCategory ?? 'taxable_10') as TaxCategory,
  notes: c?.notes ?? '',
})

const toInput = (v: ClientFormValues): ClientInput => ({
  name: v.name,
  honorific: v.honorific,
  postalCode: v.postalCode || null,
  address: v.address || null,
  tel: v.tel || null,
  contactPerson: v.contactPerson || null,
  contactDepartment: v.contactDepartment || null,
  paymentTerms: v.paymentTerms || null,
  defaultTaxCategory: v.defaultTaxCategory,
  notes: v.notes || null,
})

const TAX_CATEGORY_LABEL: Record<TaxCategory, string> = {
  taxable_10: '課税10%',
  taxable_8: '課税8%（軽減）',
  tax_free: '非課税',
}

export const SettingsClientsTab = () => {
  const { data: clients = [], isLoading } = useClients()
  const deleteMutation = useDeleteClient()
  const [editing, setEditing] = useState<Client | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openNew = () => {
    setEditing(null)
    setIsOpen(true)
  }

  const openEdit = (c: Client) => {
    setEditing(c)
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この取引先を削除しますか？')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (e) {
      alert(`削除に失敗しました: ${(e as Error).message}`)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          登録取引先：{clients.length}件
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
              <TableHead>取引先名</TableHead>
              <TableHead>敬称</TableHead>
              <TableHead>電話番号</TableHead>
              <TableHead>支払条件</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  取引先が登録されていません
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.honorific}</TableCell>
                  <TableCell>{c.tel ?? '—'}</TableCell>
                  <TableCell>{c.paymentTerms ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(c)}
                        aria-label="編集"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(c.id)}
                        aria-label="削除"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClientDialog
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
  target: Client | null
}

const ClientDialog = ({ open, onOpenChange, target }: DialogProps) => {
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: toFormValues(target),
  })

  const honorific = watch('honorific')
  const taxCategory = watch('defaultTaxCategory')

  const handleOpenChange = (v: boolean) => {
    if (v) reset(toFormValues(target))
    onOpenChange(v)
  }

  const onSubmit = async (values: ClientFormValues) => {
    const input = toInput(values)
    try {
      if (target) {
        await updateMutation.mutateAsync({ id: target.id, input })
      } else {
        await createMutation.mutateAsync(input)
      }
      onOpenChange(false)
    } catch (e) {
      alert(`保存に失敗しました: ${(e as Error).message}`)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target ? '取引先を編集' : '取引先を追加'}
          </DialogTitle>
          <DialogDescription>
            書類の宛先として使用されます
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              取引先名<span className="ml-1 text-destructive">*</span>
            </Label>
            <Input {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>敬称</Label>
            <Select
              value={honorific}
              onValueChange={(v) =>
                setValue('honorific', v as Honorific, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="御中">御中</SelectItem>
                <SelectItem value="様">様</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>デフォルト税区分</Label>
            <Select
              value={taxCategory}
              onValueChange={(v) =>
                setValue('defaultTaxCategory', v as TaxCategory, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(TAX_CATEGORY_LABEL) as TaxCategory[]
                ).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TAX_CATEGORY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>郵便番号</Label>
            <Input {...register('postalCode')} />
          </div>
          <div className="space-y-1.5">
            <Label>電話番号</Label>
            <Input {...register('tel')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>住所</Label>
            <Input {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label>担当者</Label>
            <Input {...register('contactPerson')} />
          </div>
          <div className="space-y-1.5">
            <Label>担当部署</Label>
            <Input {...register('contactDepartment')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>支払条件</Label>
            <Input
              {...register('paymentTerms')}
              placeholder="月末締め翌月末払い"
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
