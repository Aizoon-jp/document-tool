import {
  API_PATHS,
  DocumentSetting,
  DocumentSettingInput,
  DocumentType,
} from '../../types'

export async function listDocumentSettings(): Promise<DocumentSetting[]> {
  return window.ipc.invoke<DocumentSetting[]>(API_PATHS.documentSettings.list)
}

export async function updateDocumentSetting(
  type: DocumentType,
  input: DocumentSettingInput
): Promise<DocumentSetting> {
  return window.ipc.invoke<DocumentSetting>(
    API_PATHS.documentSettings.update,
    type,
    input
  )
}
