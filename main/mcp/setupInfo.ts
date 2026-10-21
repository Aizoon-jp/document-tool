import path from 'path'
import { app } from 'electron'
import type { McpSetupInfo } from '../../renderer/types'

const SERVER_NAME = 'jimu-tool'
const RUN_AS_NODE = 'ELECTRON_RUN_AS_NODE=1'

export function getMcpSetupInfo(): McpSetupInfo {
  const executablePath = app.getPath('exe')
  const bridgePath = app.isPackaged
    ? path.join(process.resourcesPath, 'mcp-bridge.js')
    : path.join(app.getAppPath(), 'resources', 'mcp-bridge.js')
  // 開発時の実行ファイルは Electron 本体なので、アプリの場所も渡す（bridge が Electron へそのまま転送する）
  const extraArgs = app.isPackaged ? [] : [app.getAppPath()]
  const args = [bridgePath, ...extraArgs]
  const quoted = [executablePath, ...args].map((a) => `"${a}"`).join(' ')
  return {
    executablePath,
    claudeCommand: `claude mcp add --scope user ${SERVER_NAME} -e ${RUN_AS_NODE} -- ${quoted}`,
    codexCommand: `codex mcp add ${SERVER_NAME} --env ${RUN_AS_NODE} -- ${quoted}`,
    // JSON の文字列表記は TOML の基本文字列としても有効（Windows の \ も正しくエスケープされる）
    codexToml: [
      `[mcp_servers.${SERVER_NAME}]`,
      `command = ${JSON.stringify(executablePath)}`,
      `args = ${JSON.stringify(args)}`,
      'env = { ELECTRON_RUN_AS_NODE = "1" }',
      'startup_timeout_sec = 30',
    ].join('\n'),
  }
}
