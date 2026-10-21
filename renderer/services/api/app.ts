import { API_PATHS, McpSetupInfo } from '../../types'

export async function getMcpSetup(): Promise<McpSetupInfo> {
  return window.ipc.invoke<McpSetupInfo>(API_PATHS.app.mcpSetup)
}
