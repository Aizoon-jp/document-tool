import net from 'net'
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

/** mcp-bridge.js が待ち受けるソケットに繋いで MCP サーバーを起動する。接続が閉じたらアプリを終了する */
export async function startMcpServer(pipeName: string): Promise<void> {
  const socket = net.connect(pipeName)
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('error', reject)
  })
  socket.on('close', () => app.quit())
  const server = createMcpServer({ generatePdf }, app.getVersion())
  await server.connect(new StdioServerTransport(socket, socket))
}
