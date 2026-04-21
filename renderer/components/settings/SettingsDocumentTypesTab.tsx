import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
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
import { Textarea } from '../ui/textarea'
import {
  useDocumentSettings,
  useUpdateDocumentSetting,
} from '../../hooks/useDocumentSettings'
import {
  DOCUMENT_TYPE_LABEL,
  type DocumentOptions,
  type DocumentSetting,
  type DocumentType,
} from '../../types'

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'receipt',
  'quote',
  'payment_request',
  'delivery_note',
]

const OPTION_LABEL: Record<keyof DocumentOptions, string> = {
  includeTax: '消費税を計算',
  reducedTaxRate: '軽減税率を区別表示',
  withholdingTax: '源泉徴収税を控除',
  showRemarks: '備考欄を表示',
  showBankInfo: '振込先を表示',
}

const toMap = (
  list: DocumentSetting[]
): Record<DocumentType, DocumentSetting> => {
  const map = {} as Record<DocumentType, DocumentSetting>
  for (const s of list) {
    map[s.documentType] = s
  }
  return map
}

export const SettingsDocumentTypesTab = () => {
  const { data: list = [], isLoading } = useDocumentSettings()
  const updateMutation = useUpdateDocumentSetting()
  const [settings, setSettings] = useState<
    Record<DocumentType, DocumentSetting>
  >({} as Record<DocumentType, DocumentSetting>)

  useEffect(() => {
    if (list.length > 0) {
      setSettings(toMap(list))
    }
  }, [list])

  const update = (type: DocumentType, patch: Partial<DocumentSetting>) => {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...patch },
    }))
  }

  const updateOption = (
    type: DocumentType,
    key: keyof DocumentOptions,
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        defaultOptions: { ...prev[type].defaultOptions, [key]: value },
      },
    }))
  }

  const handleSave = async (type: DocumentType) => {
    const s = settings[type]
    if (!s) return
    try {
      await updateMutation.mutateAsync({
        type,
        input: {
          documentType: s.documentType,
          numberFormat: s.numberFormat,
          defaultOptions: s.defaultOptions,
          defaultRemarks: s.defaultRemarks,
        },
      })
      alert(`${DOCUMENT_TYPE_LABEL[type]}の設定を保存しました`)
    } catch (e) {
      alert(`保存に失敗しました: ${(e as Error).message}`)
    }
  }

  if (isLoading || Object.keys(settings).length === 0) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {DOCUMENT_TYPES.map((type) => {
        const s = settings[type]
        if (!s) return null
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-base">
                {DOCUMENT_TYPE_LABEL[type]}
              </CardTitle>
              <CardDescription>
                採番・既定オプション・定型備考
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>採番フォーマット</Label>
                <Input
                  value={s.numberFormat}
                  onChange={(e) =>
                    update(type, { numberFormat: e.target.value })
                  }
                  placeholder="INV-{YYYY}-{MM}-{seq:3}"
                />
                <p className="text-xs text-muted-foreground">
                  {'プレースホルダ: {YYYY} {MM} {seq:3}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>デフォルトオプション</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {(
                    Object.keys(OPTION_LABEL) as (keyof DocumentOptions)[]
                  ).map((k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{OPTION_LABEL[k]}</span>
                      <Switch
                        checked={s.defaultOptions[k]}
                        onCheckedChange={(v) => updateOption(type, k, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>定型備考文</Label>
                <Textarea
                  value={s.defaultRemarks ?? ''}
                  onChange={(e) =>
                    update(type, { defaultRemarks: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSave(type)}
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
