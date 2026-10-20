import { app } from 'electron'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { generatePdf } from '../pdf/generator'
import { createMcpServer } from './server'

/** stdout は JSON-RPC 専用。console.* が混ざるとクライアントが壊れるため stderr へ流す */
export function redirectConsoleToStderr(): void {
  const toStderr = (...args: unknown[]): void => {
    console.error(...args)
  }
  console.log = toStderr
  console.info = toStderr
  console.debug = toStderr
  console.warn = toStderr
}

/** stdio で MCP サーバーを起動する。接続が閉じたらアプリを終了する */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer({ generatePdf }, app.getVersion())
  const transport = new StdioServerTransport()
  transport.onclose = () => app.quit()
  // StdioServerTransport は stdin の終了を検知しないため、自分で見る
  process.stdin.on('end', () => app.quit())
  process.stdin.on('close', () => app.quit())
  await server.connect(transport)
}
