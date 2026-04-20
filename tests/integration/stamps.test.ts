import os from 'os'
import path from 'path'
import fs from 'fs'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TEST_DIR = path.join(os.tmpdir(), `jimu-test-${process.pid}`)

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => path.join(TEST_DIR, name),
  },
}))

import { setDatabaseForTesting } from '../../main/db/client'
import {
  createStamp,
  deleteStamp,
  getStamp,
  listStamps,
  updateStamp,
} from '../../main/ipc/stamps'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb
let close: () => void

const PNG_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

beforeEach(() => {
  fs.mkdirSync(path.join(TEST_DIR, 'userData'), { recursive: true })
  const ctx = createTestDb()
  db = ctx.db
  close = ctx.close
  setDatabaseForTesting(db)
})

afterEach(() => {
  setDatabaseForTesting(null)
  close()
  fs.rmSync(TEST_DIR, { recursive: true, force: true })
})

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('stamps IPC', () => {
  it('create で画像ファイルが保存される', async () => {
    const stamp = await createStamp({
      name: '角印テスト',
      imagePath: '',
      imageDataUrl: PNG_1x1,
      defaultXMm: 140,
      defaultYMm: 55,
      widthMm: 25,
      opacity: 0.8,
      isDefault: true,
    })
    expect(stamp.id).toBeTruthy()
    expect(stamp.imagePath).toContain('stamp_')
    expect(fs.existsSync(stamp.imagePath)).toBe(true)
  })

  it('isDefault=true 登録で他のデフォルトは解除される', async () => {
    const first = await createStamp({
      name: '第1',
      imagePath: '',
      imageDataUrl: PNG_1x1,
      defaultXMm: 140,
      defaultYMm: 55,
      widthMm: 25,
      opacity: 0.8,
      isDefault: true,
    })
    await createStamp({
      name: '第2',
      imagePath: '',
      imageDataUrl: PNG_1x1,
      defaultXMm: 140,
      defaultYMm: 55,
      widthMm: 25,
      opacity: 0.8,
      isDefault: true,
    })
    const updated = await getStamp(first.id)
    expect(updated?.isDefault).toBe(false)
  })

  it('5MB超の画像は拒否', async () => {
    const hugeBase64 = 'A'.repeat(Math.ceil((6 * 1024 * 1024 * 4) / 3))
    const dataUrl = `data:image/png;base64,${hugeBase64}`
    await expect(
      createStamp({
        name: '大',
        imagePath: '',
        imageDataUrl: dataUrl,
        defaultXMm: 0,
        defaultYMm: 0,
        widthMm: 25,
        opacity: 0.8,
        isDefault: false,
      })
    ).rejects.toThrow(/5MB/)
  })

  it('PNG/JPG 以外は拒否', async () => {
    await expect(
      createStamp({
        name: '不正',
        imagePath: '',
        imageDataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        defaultXMm: 0,
        defaultYMm: 0,
        widthMm: 25,
        opacity: 0.8,
        isDefault: false,
      })
    ).rejects.toThrow(/PNGまたはJPG/)
  })

  it('delete で画像ファイルも削除', async () => {
    const stamp = await createStamp({
      name: '削除テスト',
      imagePath: '',
      imageDataUrl: PNG_1x1,
      defaultXMm: 0,
      defaultYMm: 0,
      widthMm: 25,
      opacity: 0.8,
      isDefault: false,
    })
    expect(fs.existsSync(stamp.imagePath)).toBe(true)
    await deleteStamp(stamp.id)
    expect(fs.existsSync(stamp.imagePath)).toBe(false)
    expect(await listStamps()).toHaveLength(0)
  })

  it('update で画像差し替え', async () => {
    const stamp = await createStamp({
      name: '旧',
      imagePath: '',
      imageDataUrl: PNG_1x1,
      defaultXMm: 0,
      defaultYMm: 0,
      widthMm: 25,
      opacity: 0.8,
      isDefault: false,
    })
    const oldPath = stamp.imagePath
    const updated = await updateStamp(stamp.id, {
      name: '新',
      imageDataUrl: PNG_1x1,
    })
    expect(updated.name).toBe('新')
    // 新ファイルが存在する
    expect(fs.existsSync(updated.imagePath)).toBe(true)
    // （同じファイル名なら上書き）
    expect(oldPath).toBe(updated.imagePath)
  })
})
