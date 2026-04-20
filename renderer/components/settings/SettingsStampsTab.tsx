import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Stamp as StampIcon, Trash2, Upload } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  useCreateStamp,
  useDeleteStamp,
  useStamps,
} from '../../hooks/useStamps'
import type { StampCreateInput } from '../../services/api/stamps'

const stampSchema = z.object({
  name: z.string().min(1, '印影名は必須です'),
  defaultXMm: z.coerce.number().min(0),
  defaultYMm: z.coerce.number().min(0),
  widthMm: z.coerce.number().min(1, '1mm以上'),
  opacity: z.coerce.number().min(0).max(1),
  isDefault: z.boolean(),
})

type StampFormValues = z.infer<typeof stampSchema>

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

export const SettingsStampsTab = () => {
  const { data: stamps = [], isLoading } = useStamps()
  const deleteMutation = useDeleteStamp()
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('この印影を削除しますか？')) return
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
          登録印影：{stamps.length}件（PNG/JPG、5MB以下）
        </p>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4" />
          新規追加
        </Button>
      </div>

      {stamps.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm font-medium">印影が登録されていません</p>
          <p className="mt-1 text-xs text-muted-foreground">
            書類に押印する角印画像を登録してください。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stamps.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  {s.isDefault && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      デフォルト
                    </span>
                  )}
                </div>
                <CardDescription>角印</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="flex h-32 items-center justify-center rounded-md border border-dashed bg-muted/30"
                  style={{ opacity: s.opacity }}
                >
                  <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                    <StampIcon className="h-8 w-8 opacity-40" />
                    <span>画像は書類PDFで反映されます</span>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">位置 X</dt>
                  <dd className="tabular-nums">{s.defaultXMm}mm</dd>
                  <dt className="text-muted-foreground">位置 Y</dt>
                  <dd className="tabular-nums">{s.defaultYMm}mm</dd>
                  <dt className="text-muted-foreground">幅</dt>
                  <dd className="tabular-nums">{s.widthMm}mm</dd>
                  <dt className="text-muted-foreground">透明度</dt>
                  <dd className="tabular-nums">
                    {Math.round(s.opacity * 100)}%
                  </dd>
                </dl>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StampDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  )
}

type DialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const StampDialog = ({ open, onOpenChange }: DialogProps) => {
  const createMutation = useCreateStamp()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StampFormValues>({
    resolver: zodResolver(stampSchema),
    defaultValues: {
      name: '',
      defaultXMm: 140,
      defaultYMm: 55,
      widthMm: 25,
      opacity: 0.8,
      isDefault: false,
    },
  })

  const isDefault = watch('isDefault')

  const handleOpenChange = (v: boolean) => {
    if (v) {
      reset({
        name: '',
        defaultXMm: 140,
        defaultYMm: 55,
        widthMm: 25,
        opacity: 0.8,
        isDefault: false,
      })
      setPreviewUrl(null)
      setImageDataUrl(null)
    }
    onOpenChange(v)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('PNGまたはJPG形式のみ対応')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('5MB以下のファイルを選択してください')
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    setImageDataUrl(await readFileAsDataUrl(file))
  }

  const onSubmit = async (values: StampFormValues) => {
    if (!imageDataUrl) {
      alert('画像ファイルを選択してください')
      return
    }
    const input: StampCreateInput = {
      name: values.name,
      imagePath: '',
      defaultXMm: values.defaultXMm,
      defaultYMm: values.defaultYMm,
      widthMm: values.widthMm,
      opacity: values.opacity,
      isDefault: values.isDefault,
      imageDataUrl,
    }
    try {
      await createMutation.mutateAsync(input)
      onOpenChange(false)
    } catch (e) {
      alert(`追加に失敗しました: ${(e as Error).message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>印影を追加</DialogTitle>
          <DialogDescription>
            角印画像と配置座標・透明度を登録
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              印影名<span className="ml-1 text-destructive">*</span>
            </Label>
            <Input {...register('name')} placeholder="角印（代表）" />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>画像ファイル（PNG/JPG、5MB以下）</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFile}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                ファイル選択
              </Button>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="preview"
                  className="h-16 w-16 rounded-md border object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">未選択</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>X座標 (mm)</Label>
            <Input type="number" min={0} {...register('defaultXMm')} />
          </div>
          <div className="space-y-1.5">
            <Label>Y座標 (mm)</Label>
            <Input type="number" min={0} {...register('defaultYMm')} />
          </div>
          <div className="space-y-1.5">
            <Label>幅 (mm)</Label>
            <Input type="number" min={1} {...register('widthMm')} />
            {errors.widthMm && (
              <p className="text-xs text-destructive">
                {errors.widthMm.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>透明度 (0〜1)</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              {...register('opacity')}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <div>
              <Label>デフォルトに設定</Label>
              <p className="text-xs text-muted-foreground">
                新規書類作成時に自動で選択される
              </p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={(v) =>
                setValue('isDefault', v, { shouldDirty: true })
              }
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '追加中...' : '追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
