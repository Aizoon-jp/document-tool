import { API_PATHS, McpSetupInfo } from '../../types'

export async function getAppVersion(): Promise<string> {
  return window.ipc.invoke<string>(API_PATHS.app.getVersion)
}

export async function getMcpSetup(): Promise<McpSetupInfo> {
  return window.ipc.invoke<McpSetupInfo>(API_PATHS.app.mcpSetup)
}
