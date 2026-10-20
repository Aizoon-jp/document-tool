import { app } from 'electron'
import type { McpSetupInfo } from '../../renderer/types'

const SERVER_NAME = 'jimu-tool'

export function getMcpSetupInfo(): McpSetupInfo {
  const executablePath = app.getPath('exe')
  return {
    executablePath,
    claudeCommand: `claude mcp add --scope user ${SERVER_NAME} -- "${executablePath}" --mcp`,
    codexCommand: `codex mcp add ${SERVER_NAME} -- "${executablePath}" --mcp`,
    // JSON の文字列表記は TOML の基本文字列としても有効（Windows の \ も正しくエスケープされる）
    codexToml: [
      `[mcp_servers.${SERVER_NAME}]`,
      `command = ${JSON.stringify(executablePath)}`,
      'args = ["--mcp"]',
      'startup_timeout_sec = 30',
    ].join('\n'),
  }
}
