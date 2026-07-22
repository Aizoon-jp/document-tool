import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, ScanLine, Trash2 } from 'lucide-react'
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
import { BusinessCardScanDialog } from './BusinessCardScanDialog'
import type {
  BusinessCardScan,
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
  numberPrefix: z.string(),
  notes: z.string(),
})

type ClientFormValues = z.infer<typeof clientSchema>

const toFormValues = (
  c: Client | null,
  scan?: BusinessCardScan | null
): ClientFormValues => ({
  name: c?.name ?? scan?.name ?? '',
  honorific: (c?.honorific ?? '御中') as Honorific,
  postalCode: c?.postalCode ?? scan?.postalCode ?? '',
  address: c?.address ?? scan?.address ?? '',
  tel: c?.tel ?? scan?.tel ?? '',
  contactPerson: c?.contactPerson ?? scan?.contactPerson ?? '',
  contactDepartment: c?.contactDepartment ?? scan?.contactDepartment ?? '',
  paymentTerms: c?.paymentTerms ?? '',
  defaultTaxCategory: (c?.defaultTaxCategory ?? 'taxable_10') as TaxCategory,
  numberPrefix: c?.numberPrefix ?? '',
  notes: c?.notes ?? scan?.notes ?? '',
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
  numberPrefix: v.numberPrefix.trim() || null,
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
  const [scanOpen, setScanOpen] = useState(false)
  const [scanResult, setScanResult] = useState<BusinessCardScan | null>(null)

  const openNew = () => {
    setEditing(null)
    setScanResult(null)
    setIsOpen(true)
  }

  const openEdit = (c: Client) => {
    setEditing(c)
    setScanResult(null)
    setIsOpen(true)
  }

  const handleScanned = (result: BusinessCardScan) => {
    setEditing(null)
    setScanResult(result)
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScanOpen(true)}>
            <ScanLine className="h-4 w-4" />
            名刺から登録
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            新規追加
          </Button>
        </div>
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

      <BusinessCardScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanned={handleScanned}
      />

      <ClientDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        target={editing}
        scan={scanResult}
      />
    </div>
  )
}

type DialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  target: Client | null
  scan: BusinessCardScan | null
}

const ClientDialog = ({ open, onOpenChange, target, scan }: DialogProps) => {
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
    defaultValues: toFormValues(target, scan),
  })

  const honorific = watch('honorific')
  const taxCategory = watch('defaultTaxCategory')

  // 開くたびに対象（編集対象 or 名刺読み取り結果）で初期化する。
  // プログラム的に open されるケースがあるため onOpenChange では拾えない。
  useEffect(() => {
    if (open) reset(toFormValues(target, scan))
  }, [open, target, scan, reset])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target ? '取引先を編集' : '取引先を追加'}
          </DialogTitle>
          <DialogDescription>
            {scan
              ? '名刺の読み取り結果です。内容を確認・修正してから保存してください'
              : '書類の宛先として使用されます'}
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
            <Label>書類番号プレフィックス</Label>
            <Input
              {...register('numberPrefix')}
              placeholder="例: A- （空欄でも履歴から自動追従されます）"
            />
            <p className="text-xs text-muted-foreground">
              入力すると「プレフィックス + 連番」で独立採番します。
              空欄の場合、この取引先で過去に作成した書類があれば、その番号の末尾数字を自動インクリメントして提案します（1枚目を手入力すれば2枚目以降が追従）。
            </p>
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
