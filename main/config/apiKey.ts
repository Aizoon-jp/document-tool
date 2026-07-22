import { getStore } from './store'

const KEY_PREFIX = 'sk-ant-'

export function getApiKey(): string | null {
  const stored = getStore().get('anthropicApiKey')
  const trimmed = stored?.trim()
  return trimmed ? trimmed : null
}

export function setApiKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed.startsWith(KEY_PREFIX)) {
    throw new Error(`APIキーの形式が正しくありません（${KEY_PREFIX} で始まる必要があります）`)
  }
  getStore().set('anthropicApiKey', trimmed)
}

export function clearApiKey(): void {
  getStore().delete('anthropicApiKey')
}

export function hasApiKey(): boolean {
  return getApiKey() !== null
}
