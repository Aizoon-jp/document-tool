import { API_PATHS, ApiKeyStatus, BusinessCardScan } from '../../types'

export async function scanBusinessCard(
  imageDataUrl: string
): Promise<BusinessCardScan> {
  return window.ipc.invoke<BusinessCardScan>(
    API_PATHS.businessCard.scan,
    imageDataUrl
  )
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  return window.ipc.invoke<ApiKeyStatus>(API_PATHS.settings.getApiKey)
}

export async function setApiKey(key: string): Promise<void> {
  await window.ipc.invoke<void>(API_PATHS.settings.setApiKey, key)
}

export async function clearApiKey(): Promise<void> {
  await window.ipc.invoke<void>(API_PATHS.settings.clearApiKey)
}
