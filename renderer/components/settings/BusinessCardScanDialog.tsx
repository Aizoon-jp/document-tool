import { useEffect, useRef, useState } from 'react'
import { ImageUp, Loader2, ScanLine } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  useApiKeyStatus,
  useScanBusinessCard,
  useSetApiKey,
} from '../../hooks/useBusinessCard'
import type { BusinessCardScan } from '../../types'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

/** 選択された画像が扱える形式か検証する。問題があればエラーメッセージを返す */
const validate = (file: File): string | null => {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'PNGまたはJPG形式の画像を選択してください'
  }
  if (file.size > MAX_SIZE_BYTES) {
    return '5MB以下の画像を選択してください'
  }
  return null
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onScanned: (result: BusinessCardScan) => void
}

export const BusinessCardScanDialog = ({
  open,
  onOpenChange,
  onScanned,
}: Props) => {
  const { data: apiKeyStatus } = useApiKeyStatus()
  const setApiKeyMutation = useSetApiKey()
  const scanMutation = useScanBusinessCard()

  const [keyInput, setKeyInput] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const needsApiKey = apiKeyStatus?.configured === false

  const reset = () => {
    setPreviewUrl(null)
    setError(null)
    setIsDragging(false)
    setKeyInput('')
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const handleFile = async (file: File) => {
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    const dataUrl = await readFileAsDataUrl(file)
    setPreviewUrl(dataUrl)

    try {
      const result = await scanMutation.mutateAsync(dataUrl)
      onScanned(result)
      handleOpenChange(false)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // クリップボードからの貼り付け（Ctrl+V）
  useEffect(() => {
    if (!open || needsApiKey) return
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? [])[0]
      if (file) {
        e.preventDefault()
        void handleFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const handleSaveKey = async () => {
    try {
      await setApiKeyMutation.mutateAsync(keyInput)
      setKeyInput('')
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const isScanning = scanMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>名刺から取引先を登録</DialogTitle>
          <DialogDescription>
            名刺の画像を読み取って、取引先の入力欄に自動で反映します
          </DialogDescription>
        </DialogHeader>

        {needsApiKey ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              名刺の読み取りには Anthropic の APIキーが必要です。
              一度登録すれば次回以降は不要です。
            </p>
            <div className="space-y-1.5">
              <Label>APIキー</Label>
              <Input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              type="button"
              onClick={handleSaveKey}
              disabled={!keyInput.trim() || setApiKeyMutation.isPending}
            >
              {setApiKeyMutation.isPending ? '保存中...' : 'APIキーを保存'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) void handleFile(file)
              }}
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center transition-colors ${
                isDragging ? 'border-primary bg-accent' : 'border-muted'
              }`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">読み取り中...</p>
                </>
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="名刺プレビュー"
                  className="max-h-[160px] object-contain"
                />
              ) : (
                <>
                  <ImageUp className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    名刺画像をドラッグ&ドロップ
                  </p>
                  <p className="text-xs text-muted-foreground">
                    クリックしてファイル選択 / Ctrl+V で貼り付けも可能
                    （PNG・JPG / 5MBまで）
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              読み取り結果は自動保存されません。内容を確認・修正してから保存してください。
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
