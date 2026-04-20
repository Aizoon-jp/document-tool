import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileDown, Save, X } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import { Separator } from '../../components/ui/separator'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  DOCUMENT_TYPE_LABEL,
  DocumentType,
} from '../../types'
import {
  MOCK_CLIENTS,
  MOCK_ITEMS,
  MOCK_STAMPS,
} from '../../components/documents/mockData'
import {
  documentFormSchema,
  DocumentFormValues,
} from '../../components/documents/schema'
import {
  calcLine,
  calcWithholdingTax,
  formatCurrency,
  generateDocumentNumber,
} from '../../components/documents/utils'
import { DocumentPreview } from '../../components/documents/DocumentPreview'
import { DocumentLinesField } from '../../components/documents/DocumentLinesField'

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'receipt',
  'quote',
  'payment_request',
  'delivery_note',
]

const isDocumentType = (v: unknown): v is DocumentType =>
  typeof v === 'string' && (DOCUMENT_TYPES as string[]).includes(v)

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const buildDefaults = (type: DocumentType): DocumentFormValues => ({
  documentType: type,
  clientId: '',
  issueDate: todayIso(),
  documentNumber: generateDocumentNumber(type, todayIso()),
  detailMode: 'direct',
  lines: [
    {
      itemId: null,
      content: '',
      quantity: 1,
      unit: '式',
      unitPrice: 0,
      taxRate: 10,
      isReducedTaxRate: false,
    },
  ],
  externalAmount: 0,
  options: {
    includeTax: true,
    reducedTaxRate: false,
    withholdingTax: false,
    showRemarks: false,
    showBankInfo: type === 'invoice' || type === 'payment_request',
  },
  stampIds: MOCK_STAMPS.filter((s) => s.isDefault).map((s) => s.id),
  remarks: '',
})

const OPTION_LABELS: Record<keyof DocumentFormValues['options'], string> = {
  includeTax: '消費税を表示',
  reducedTaxRate: '軽減税率（8%）を適用',
  withholdingTax: '源泉徴収を自動計算',
  showRemarks: '備考を表示',
  showBankInfo: '振込先情報を表示',
}

export default function NewDocumentPage() {
  const router = useRouter()
  const rawType = router.query.type
  const initialType: DocumentType = isDocumentType(rawType) ? rawType : 'invoice'

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: buildDefaults(initialType),
    mode: 'onChange',
  })
  const { control, register, setValue, handleSubmit, watch } = form

  // URL の type クエリが変わったら追従
  useEffect(() => {
    if (isDocumentType(rawType) && rawType !== watch('documentType')) {
      setValue('documentType', rawType)
      setValue(
        'documentNumber',
        generateDocumentNumber(rawType, watch('issueDate'))
      )
      setValue(
        'options.showBankInfo',
        rawType === 'invoice' || rawType === 'payment_request'
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawType])

  const values = useWatch({ control }) as DocumentFormValues

  const selectedClient = useMemo(
    () => MOCK_CLIENTS.find((c) => c.id === values.clientId) ?? null,
    [values.clientId]
  )
  const selectedStamps = useMemo(
    () => MOCK_STAMPS.filter((s) => values.stampIds?.includes(s.id)),
    [values.stampIds]
  )

  // 合計の計算（左ペインのサマリー表示用）
  const { subtotal, taxAmount, withholdingTax, total } = useMemo(() => {
    const ls = values.lines ?? []
    const sub =
      values.detailMode === 'external'
        ? Number(values.externalAmount) || 0
        : ls.reduce(
            (a, l) =>
              a +
              calcLine(
                l.quantity,
                l.unitPrice,
                l.taxRate,
                values.options.includeTax
              ).subtotalExclTax,
            0
          )
    const tax =
      values.detailMode === 'external'
        ? values.options.includeTax
          ? Math.floor(sub * 0.1)
          : 0
        : ls.reduce(
            (a, l) =>
              a +
              calcLine(
                l.quantity,
                l.unitPrice,
                l.taxRate,
                values.options.includeTax
              ).taxAmount,
            0
          )
    const wh = values.options.withholdingTax ? calcWithholdingTax(sub) : 0
    return { subtotal: sub, taxAmount: tax, withholdingTax: wh, total: sub + tax - wh }
  }, [values])

  const onSubmit = (data: DocumentFormValues) => {
    // Phase 4 ではまだIPC未接続。ダミー動作
    // eslint-disable-next-line no-console
    console.log('PDF生成', data)
    alert('PDF生成（仮）：コンソールに内容を出力しました')
  }

  const onSaveDraft = () => {
    // eslint-disable-next-line no-console
    console.log('下書き保存', form.getValues())
    alert('下書き保存（仮）：コンソールに内容を出力しました')
  }

  const toggleStamp = (id: string) => {
    const current = form.getValues('stampIds')
    setValue(
      'stampIds',
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
      { shouldDirty: true }
    )
  }

  const handleChangeDocumentType = (next: DocumentType) => {
    setValue('documentType', next)
    setValue(
      'documentNumber',
      generateDocumentNumber(next, form.getValues('issueDate'))
    )
    setValue(
      'options.showBankInfo',
      next === 'invoice' || next === 'payment_request'
    )
    router.replace(
      { pathname: router.pathname, query: { type: next } },
      undefined,
      { shallow: true }
    )
  }

  return (
    <>
      <Head>
        <title>
          書類作成：{DOCUMENT_TYPE_LABEL[values.documentType]} — 事務ツール
        </title>
      </Head>

      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                書類作成：{DOCUMENT_TYPE_LABEL[values.documentType]}
              </h1>
              <p className="text-sm text-muted-foreground">
                取引先・明細・オプションを入力すると、右側にプレビューが自動で反映されます。
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                <X className="mr-1 h-4 w-4" />
                キャンセル
              </Button>
              <Button type="button" variant="outline" onClick={onSaveDraft}>
                <Save className="mr-1 h-4 w-4" />
                下書き保存
              </Button>
              <Button type="submit">
                <FileDown className="mr-1 h-4 w-4" />
                PDF生成
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
            {/* 左：フォーム */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基本情報</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="documentType">書類種別</Label>
                    <Select
                      value={values.documentType}
                      onValueChange={(v) =>
                        handleChangeDocumentType(v as DocumentType)
                      }
                    >
                      <SelectTrigger id="documentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {DOCUMENT_TYPE_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="clientId">取引先</Label>
                    <Select
                      value={values.clientId}
                      onValueChange={(v) =>
                        setValue('clientId', v, { shouldDirty: true, shouldValidate: true })
                      }
                    >
                      <SelectTrigger id="clientId">
                        <SelectValue placeholder="取引先を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_CLIENTS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.honorific}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="issueDate">発行日</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      {...register('issueDate')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="documentNumber">書類番号</Label>
                    <Input
                      id="documentNumber"
                      className="font-mono"
                      {...register('documentNumber')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">明細</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={values.detailMode}
                    onValueChange={(v) =>
                      setValue('detailMode', v as 'direct' | 'external', {
                        shouldDirty: true,
                      })
                    }
                    className="flex gap-6"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value="direct" />
                      直接記載
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value="external" />
                      別紙明細の通り
                    </label>
                  </RadioGroup>

                  <Separator />

                  {values.detailMode === 'direct' ? (
                    <DocumentLinesField control={control} items={MOCK_ITEMS} />
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="externalAmount">合計金額（税抜）</Label>
                      <Input
                        id="externalAmount"
                        type="number"
                        step="1"
                        className="text-right"
                        {...register('externalAmount')}
                      />
                      <p className="text-xs text-muted-foreground">
                        別紙として明細を添付する場合に利用します。
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">小計</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {values.options.includeTax && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">消費税</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                    {values.options.withholdingTax && (
                      <div className="flex justify-between text-rose-600">
                        <span>源泉徴収税</span>
                        <span>- {formatCurrency(withholdingTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 text-base font-semibold">
                      <span>合計</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">オプション</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {(
                    Object.keys(OPTION_LABELS) as Array<
                      keyof DocumentFormValues['options']
                    >
                  ).map((key) => (
                    <label
                      key={key}
                      htmlFor={`opt-${key}`}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-md border p-3 text-sm"
                    >
                      <span>{OPTION_LABELS[key]}</span>
                      <Switch
                        id={`opt-${key}`}
                        checked={values.options[key]}
                        onCheckedChange={(v) =>
                          setValue(`options.${key}`, v, { shouldDirty: true })
                        }
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">印影</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {MOCK_STAMPS.map((s) => {
                    const active = values.stampIds?.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStamp(s.id)}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input hover:bg-accent'
                        }`}
                      >
                        {s.name}
                        {s.isDefault && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            （既定）
                          </span>
                        )}
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              {values.options.showRemarks && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">備考</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      rows={4}
                      placeholder="お客様に伝える補足事項を入力してください"
                      {...register('remarks')}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右：プレビュー */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">プレビュー</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentPreview
                    values={values}
                    client={selectedClient}
                    stamps={selectedStamps}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </FormProvider>
    </>
  )
}
