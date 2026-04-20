import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import type { BankAccountType, Company } from '../../types'

const companySchema = z.object({
  name: z.string().min(1, '会社名は必須です'),
  tradeName: z.string(),
  postalCode: z.string(),
  address: z.string(),
  tel: z.string(),
  fax: z.string(),
  email: z.string(),
  website: z.string(),
  representativeName: z.string(),
  invoiceNumber: z.string(),
  bankName: z.string(),
  bankBranch: z.string(),
  bankAccountType: z.enum(['ordinary', 'checking']),
  bankAccountNumber: z.string(),
  bankAccountHolderKana: z.string(),
})

type CompanyFormValues = z.infer<typeof companySchema>

const DEFAULT_COMPANY: Company = {
  id: 'co1',
  name: '株式会社サンプル',
  tradeName: 'Sample Inc.',
  postalCode: '150-0001',
  address: '東京都渋谷区神宮前1-1-1 サンプルビル5F',
  tel: '03-0000-0000',
  fax: '03-0000-0001',
  email: 'info@sample.co.jp',
  website: 'https://sample.co.jp',
  representativeName: '山田 太郎',
  invoiceNumber: 'T1234567890123',
  bankName: 'みずほ銀行',
  bankBranch: '渋谷支店',
  bankAccountType: 'ordinary',
  bankAccountNumber: '1234567',
  bankAccountHolderKana: 'カブシキガイシャサンプル',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const toFormValues = (c: Company): CompanyFormValues => ({
  name: c.name,
  tradeName: c.tradeName ?? '',
  postalCode: c.postalCode ?? '',
  address: c.address ?? '',
  tel: c.tel ?? '',
  fax: c.fax ?? '',
  email: c.email ?? '',
  website: c.website ?? '',
  representativeName: c.representativeName ?? '',
  invoiceNumber: c.invoiceNumber ?? '',
  bankName: c.bankName ?? '',
  bankBranch: c.bankBranch ?? '',
  bankAccountType: (c.bankAccountType ?? 'ordinary') as BankAccountType,
  bankAccountNumber: c.bankAccountNumber ?? '',
  bankAccountHolderKana: c.bankAccountHolderKana ?? '',
})

export const SettingsCompanyTab = () => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: toFormValues(DEFAULT_COMPANY),
  })

  const accountType = watch('bankAccountType')

  const onSubmit = (values: CompanyFormValues) => {
    // eslint-disable-next-line no-console
    console.log('[settings/company] save', values)
    alert('会社基本情報を保存しました（ダミー動作）')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
          <CardDescription>書類に印字される自社情報</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="会社名" error={errors.name?.message} required>
            <Input {...register('name')} />
          </Field>
          <Field label="屋号（任意）">
            <Input {...register('tradeName')} />
          </Field>
          <Field label="郵便番号">
            <Input {...register('postalCode')} placeholder="150-0001" />
          </Field>
          <Field label="代表者名">
            <Input {...register('representativeName')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="住所">
              <Input {...register('address')} />
            </Field>
          </div>
          <Field label="電話番号">
            <Input {...register('tel')} />
          </Field>
          <Field label="FAX">
            <Input {...register('fax')} />
          </Field>
          <Field label="メールアドレス">
            <Input type="email" {...register('email')} />
          </Field>
          <Field label="Webサイト">
            <Input {...register('website')} />
          </Field>
          <Field label="インボイス登録番号">
            <Input {...register('invoiceNumber')} placeholder="T1234567890123" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">振込先口座</CardTitle>
          <CardDescription>請求書等の振込先として表示</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="銀行名">
            <Input {...register('bankName')} />
          </Field>
          <Field label="支店名">
            <Input {...register('bankBranch')} />
          </Field>
          <Field label="口座種別">
            <Select
              value={accountType}
              onValueChange={(v) =>
                setValue('bankAccountType', v as BankAccountType, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordinary">普通</SelectItem>
                <SelectItem value="checking">当座</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="口座番号">
            <Input {...register('bankAccountNumber')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="口座名義（カナ）">
              <Input {...register('bankAccountHolderKana')} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </form>
  )
}

type FieldProps = {
  label: string
  children: React.ReactNode
  error?: string
  required?: boolean
}

const Field = ({ label, children, error, required }: FieldProps) => (
  <div className="space-y-1.5">
    <Label>
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
)
