import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from '../config/apiKey'
import { getDataDir } from '../config/dataDir'
import { generateId } from '../helpers/id'
import type { BusinessCardScan } from '../../renderer/types'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
// Haiku 4.5 は標準解像度（長辺1568px）までしか扱えず、旧字体（髙・﨑など）を
// 常用漢字に誤変換する事象を実測で確認したため、高解像度対応の Sonnet 5 を使う。
const MODEL = 'claude-sonnet-5'

/** 名刺から読み取る生の項目。読み取れない項目は空文字を返させる。 */
const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    companyName: { type: 'string', description: '会社名・団体名。株式会社などの法人格も含めて記載どおりに' },
    postalCode: { type: 'string', description: '郵便番号。〒を除き 123-4567 形式' },
    address: { type: 'string', description: '住所。郵便番号を含めない。ビル名・階数まで' },
    tel: { type: 'string', description: '固定電話番号。FAXや携帯は含めない' },
    fax: { type: 'string', description: 'FAX番号' },
    mobile: { type: 'string', description: '携帯電話番号（090/080/070 で始まるもの）' },
    email: { type: 'string', description: 'メールアドレス' },
    url: { type: 'string', description: 'WebサイトのURL' },
    personName: { type: 'string', description: '氏名' },
    department: { type: 'string', description: '部署名のみ。役職は含めない' },
    title: { type: 'string', description: '役職名のみ。部署名は含めない' },
  },
  required: [
    'companyName',
    'postalCode',
    'address',
    'tel',
    'fax',
    'mobile',
    'email',
    'url',
    'personName',
    'department',
    'title',
  ],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `あなたは日本の名刺を読み取って構造化データにする専門家です。

守るべきルール:
- 名刺画像に実際に書かれている文字だけを転記する。読み取れない項目は必ず空文字にする。推測や創作は絶対にしない。
- 電話番号は「TEL」「FAX」「携帯」「Mobile」などのラベルと近接関係から種別を判断する。ラベルが無い場合、090/080/070 で始まる番号は携帯として扱う。
- 郵便番号は住所から分離し、〒記号を除いた 123-4567 形式にする。
- 「営業本部 第一営業部 部長」のような表記は、部署（営業本部 第一営業部）と役職（部長）に分離する。
- 縦書きの名刺も正しい読み順で解釈する。
- 氏名の漢字は字形を一画ずつ厳密に見分け、名刺に印刷されている字体をそのまま出力する。常用漢字への置き換えは誤記であり、相手に失礼にあたるため絶対に行わない。
  特に次の組み合わせは見た目が似ているが別の字なので必ず区別すること:
  髙（はしごだか）と高 / 﨑（たつさき）と崎 / 濵と浜 / 邊・邉と辺 / 澤と沢 / 齋・齊と斎・斉 / 冨と富 / 栁と柳 / 眞と真 / 德と徳
  氏名を出力する前に、その漢字が上記のどれかに該当しないか一度確認してから確定する。`

function cardsDir(): string {
  const dir = path.join(getDataDir(), 'business_cards')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function decodeDataUrl(dataUrl: string): {
  buffer: Buffer
  base64: string
  mediaType: 'image/png' | 'image/jpeg'
  ext: 'png' | 'jpg'
} {
  const match = dataUrl.match(/^data:(image\/(png|jpeg));base64,(.+)$/)
  if (!match) {
    throw new Error('PNGまたはJPG形式のみ対応')
  }
  const buffer = Buffer.from(match[3], 'base64')
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw new Error('5MB以下の画像を選択してください')
  }
  return {
    buffer,
    base64: match[3],
    mediaType: match[1] as 'image/png' | 'image/jpeg',
    ext: match[2] === 'png' ? 'png' : 'jpg',
  }
}

function saveImage(buffer: Buffer, ext: 'png' | 'jpg'): string {
  const safe = path.basename(`card_${generateId()}.${ext}`)
  const filePath = path.join(cardsDir(), safe)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

/** 既存カラムに収まらない項目は備考欄にまとめる（DBスキーマを変えずに情報を残す） */
function buildNotes(raw: Record<string, string>): string {
  const lines = [
    ['役職', raw.title],
    ['メール', raw.email],
    ['携帯', raw.mobile],
    ['FAX', raw.fax],
    ['URL', raw.url],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
  return lines.join('\n')
}

function toFriendlyError(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) {
    return new Error('APIキーが無効です。設定画面でキーを確認してください')
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new Error('APIキーにこのモデルの利用権限がありません')
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new Error('APIの利用制限に達しました。しばらく待ってから再試行してください')
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new Error('Anthropic APIに接続できません。ネットワーク接続を確認してください')
  }
  // APIConnectionError は APIError のサブクラスなので、この順序で判定する
  if (e instanceof Anthropic.APIError) {
    return new Error(`名刺の読み取りに失敗しました (${e.status}): ${e.message}`)
  }
  return e instanceof Error ? e : new Error('名刺の読み取りに失敗しました')
}

export async function scanBusinessCard(
  imageDataUrl: string
): Promise<BusinessCardScan> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('APIキーが未設定です。設定画面で登録してください')
  }

  const { buffer, base64, mediaType, ext } = decodeDataUrl(imageDataUrl)
  const client = new Anthropic({ apiKey })

  let raw: Record<string, string>
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      // 転記タスクなので思考は不要。Sonnet 5 は既定で adaptive thinking が有効になり
      // max_tokens を思考が消費して結果が途中で切れるため、明示的に無効化する。
      thinking: { type: 'disabled' },
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: EXTRACT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: 'この名刺を読み取ってください。' },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      throw new Error('この画像は読み取りを拒否されました')
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('読み取り結果が長すぎて途中で切れました')
    }

    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') {
      throw new Error('読み取り結果を取得できませんでした')
    }
    raw = JSON.parse(text.text) as Record<string, string>
  } catch (e) {
    throw toFriendlyError(e)
  }

  const imagePath = saveImage(buffer, ext)

  return {
    name: raw.companyName ?? '',
    postalCode: raw.postalCode ?? '',
    address: raw.address ?? '',
    tel: raw.tel ?? '',
    contactPerson: raw.personName ?? '',
    contactDepartment: raw.department ?? '',
    notes: buildNotes(raw),
    imagePath,
  }
}
