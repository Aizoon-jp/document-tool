import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

const TEST_DIR = path.join(os.tmpdir(), `jimu-card-${process.pid}`)

vi.mock('electron', () => ({
  app: { getPath: (name: string) => path.join(TEST_DIR, name) },
}))

const memory: Record<string, string | undefined> = {}

vi.mock('../../main/config/store', () => ({
  getStore: () => ({
    get: (k: string) => memory[k],
    set: (k: string, v: string) => {
      memory[k] = v
    },
    delete: (k: string) => {
      delete memory[k]
    },
  }),
}))

import { clearApiKey, getApiKey, setApiKey } from '../../main/config/apiKey'
import { scanBusinessCard } from '../../main/ipc/businessCard'

const PNG_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('APIキーの保存', () => {
  it('形式が正しいキーを保存・取得・削除できる', () => {
    setApiKey('  sk-ant-test-abc123  ')
    expect(getApiKey()).toBe('sk-ant-test-abc123')
    clearApiKey()
    expect(getApiKey()).toBeNull()
  })

  it('形式が不正なキーを弾く', () => {
    expect(() => setApiKey('invalid-key')).toThrow('APIキーの形式')
  })
})

describe('scanBusinessCard の入力検証', () => {
  it('APIキー未設定なら読み取り前に中断する', async () => {
    clearApiKey()
    await expect(scanBusinessCard(PNG_1x1)).rejects.toThrow('APIキーが未設定')
  })

  it('PNG/JPG以外の形式を弾く', async () => {
    setApiKey('sk-ant-test-abc123')
    await expect(
      scanBusinessCard('data:image/gif;base64,AAAA')
    ).rejects.toThrow('PNGまたはJPG形式のみ対応')
    clearApiKey()
  })

  it('5MBを超える画像を弾く', async () => {
    setApiKey('sk-ant-test-abc123')
    const huge = `data:image/png;base64,${'A'.repeat(8 * 1024 * 1024)}`
    await expect(scanBusinessCard(huge)).rejects.toThrow('5MB以下')
    clearApiKey()
  })
})
