import { useEffect, useState } from 'react'
import { FolderOpen, RefreshCw, HardDrive, AlertTriangle } from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import {
  changeDataDir,
  chooseDataDir,
  getDataDir,
  resetDataDir,
} from '../../services/api/settings'
import type { DataDirStatus } from '../../types'

export const SettingsDataTab = () => {
  const [status, setStatus] = useState<DataDirStatus | null>(null)
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [mode, setMode] = useState<'move' | 'use-existing'>('move')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    getDataDir().then(setStatus)
  }, [])

  const handleChoose = async () => {
    const p = await chooseDataDir()
    if (p) setSelectedPath(p)
  }

  const handleApply = async () => {
    if (!selectedPath) return
    const confirmed = window.confirm(
      mode === 'move'
        ? `データ保存先を変更し、現在のデータを新しいフォルダにコピーします。\n\n新しいフォルダ: ${selectedPath}\n\n適用後アプリが再起動します。続行しますか？`
        : `データ保存先を変更します（既存データはコピーしません）。\n\n新しいフォルダ: ${selectedPath}\n\n適用後アプリが再起動します。続行しますか？`
    )
    if (!confirmed) return
    setApplying(true)
    try {
      await changeDataDir(selectedPath, mode)
    } catch (e) {
      setApplying(false)
      alert(`変更に失敗しました: ${String(e)}`)
    }
  }

  const handleReset = async () => {
    const confirmed = window.confirm(
      'データ保存先を既定の場所に戻します。\n\n現在のデータはそのまま（カスタム側に残る）で、既定の場所のデータが読み込まれます。\n\nアプリが再起動します。続行しますか？'
    )
    if (!confirmed) return
    setApplying(true)
    try {
      await resetDataDir()
    } catch (e) {
      setApplying(false)
      alert(`リセットに失敗しました: ${String(e)}`)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            データ保存先
          </CardTitle>
          <CardDescription>
            データベースと印影画像の保存先フォルダです。OneDrive等のクラウド同期フォルダに変更することで複数PC間で共有できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>現在のフォルダ</Label>
            <Input value={status?.current ?? '読込中...'} readOnly />
            <p className="text-xs text-muted-foreground">
              {status?.isCustom
                ? 'カスタム設定が適用されています'
                : '既定の場所を使用しています'}
            </p>
          </div>

          {status?.isCustom && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={applying}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                既定の場所に戻す
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">保存先を変更</CardTitle>
          <CardDescription>
            新しいフォルダを選択すると、現在のデータをコピーして切り替えます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>新しいフォルダ</Label>
            <div className="flex gap-2">
              <Input
                value={selectedPath}
                readOnly
                placeholder="フォルダを選択してください"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleChoose}
                disabled={applying}
              >
                <FolderOpen className="h-4 w-4" />
                選択
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>既存データの扱い</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="move" id="mode-move" className="mt-0.5" />
                <Label htmlFor="mode-move" className="font-normal leading-tight">
                  現在のデータを新フォルダにコピーしてから切替
                  <div className="text-xs text-muted-foreground">
                    初めて変更する場合はこちら
                  </div>
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem
                  value="use-existing"
                  id="mode-use"
                  className="mt-0.5"
                />
                <Label htmlFor="mode-use" className="font-normal leading-tight">
                  新フォルダ内の既存データをそのまま使う
                  <div className="text-xs text-muted-foreground">
                    別PCから同期されたデータを読み込む場合はこちら
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">複数PCで共有する際の注意</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>同時にアプリを開かないでください（データ破損の恐れ）</li>
                  <li>
                    クラウド同期（OneDrive等）の反映に数秒〜数十秒の遅延があります
                  </li>
                  <li>片方でアプリを閉じてから、別PCで開いてください</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleApply}
              disabled={!selectedPath || applying}
            >
              {applying ? '適用中...' : '変更を適用して再起動'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
