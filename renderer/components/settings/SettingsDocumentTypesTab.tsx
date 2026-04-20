import { useState } from 'react'
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

const DEFAULT_OPTIONS: DocumentOptions = {
  includeTax: true,
  reducedTaxRate: true,
  withholdingTax: false,
  showRemarks: true,
  showBankInfo: true,
}

const OPTION_LABEL: Record<keyof DocumentOptions, string> = {
  includeTax: '消費税を計算',
  reducedTaxRate: '軽減税率を区別表示',
  withholdingTax: '源泉徴収税を控除',
  showRemarks: '備考欄を表示',
  showBankInfo: '振込先を表示',
}

const buildInitial = (): Record<DocumentType, DocumentSetting> => {
  const now = '2026-01-01T00:00:00Z'
  const baseByType: Record<DocumentType, Partial<DocumentSetting>> = {
    invoice: {
      numberFormat: 'INV-{YYYY}-{MM}-{seq:3}',
      defaultRemarks: 'お振込手数料はお客様にてご負担ください。',
    },
    receipt: {
      numberFormat: 'RCP-{YYYY}-{MM}-{seq:3}',
      defaultRemarks: '上記、正に領収いたしました。',
    },
    quote: {
      numberFormat: 'QT-{YYYY}-{MM}-{seq:3}',
      defaultRemarks: 'お見積有効期限：発行日より30日間',
    },
    payment_request: {
      numberFormat: 'PR-{YYYY}-{MM}-{seq:3}',
      defaultRemarks: '下記口座へお振込をお願いいたします。',
    },
    delivery_note: {
      numberFormat: 'DN-{YYYY}-{MM}-{seq:3}',
      defaultRemarks: '上記の通り納品いたしました。',
    },
  }
  return DOCUMENT_TYPES.reduce<Record<DocumentType, DocumentSetting>>(
    (acc, t) => {
      acc[t] = {
        id: `ds-${t}`,
        documentType: t,
        numberFormat: baseByType[t].numberFormat ?? '',
        defaultOptions: { ...DEFAULT_OPTIONS },
        defaultRemarks: baseByType[t].defaultRemarks ?? null,
        createdAt: now,
        updatedAt: now,
      }
      return acc
    },
    {} as Record<DocumentType, DocumentSetting>
  )
}

export const SettingsDocumentTypesTab = () => {
  const [settings, setSettings] =
    useState<Record<DocumentType, DocumentSetting>>(buildInitial)

  const update = (
    type: DocumentType,
    patch: Partial<DocumentSetting>
  ) => {
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

  const handleSave = (type: DocumentType) => {
    // eslint-disable-next-line no-console
    console.log('[settings/document-types] save', settings[type])
    alert(
      `${DOCUMENT_TYPE_LABEL[type]}の設定を保存しました（ダミー動作）`
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {DOCUMENT_TYPES.map((type) => {
        const s = settings[type]
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
                >
                  <Save className="h-4 w-4" />
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
