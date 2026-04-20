import {
  API_PATHS,
  DocumentSetting,
  DocumentSettingInput,
  DocumentType,
} from '../../types'

export async function listDocumentSettings(): Promise<DocumentSetting[]> {
  void API_PATHS.documentSettings.list
  throw new Error('API not implemented')
}

export async function updateDocumentSetting(
  type: DocumentType,
  input: DocumentSettingInput
): Promise<DocumentSetting> {
  void type
  void input
  void API_PATHS.documentSettings.update
  throw new Error('API not implemented')
}
