import { useEffect, useState } from 'react'
import { Bot, Check, Copy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { getMcpSetup } from '../../services/api/app'
import type { McpSetupInfo } from '../../types'

const CommandBlock = ({ label, text }: { label: string; text: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'コピーしました' : 'コピー'}
        </Button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-muted/50 p-3 text-xs">
        {text}
      </pre>
    </div>
  )
}

export const SettingsMcpCard = () => {
  const [info, setInfo] = useState<McpSetupInfo | null>(null)

  useEffect(() => {
    getMcpSetup().then(setInfo)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI連携（Claude Code / Codex）
        </CardTitle>
        <CardDescription>
          下のコマンドを一度だけ実行すると、Claude Code や Codex から書類の作成・検索ができます。
          書類の削除や設定の変更はできません。画面を開いたままでも使えます。
          Macは、先にこのアプリを普通に開いて警告を許可してから登録してください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {info ? (
          <>
            <CommandBlock label="Claude Code" text={info.claudeCommand} />
            <CommandBlock label="Codex（コマンド）" text={info.codexCommand} />
            <CommandBlock label="Codex（~/.codex/config.toml に直接書く場合）" text={info.codexToml} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">読込中...</p>
        )}
      </CardContent>
    </Card>
  )
}
