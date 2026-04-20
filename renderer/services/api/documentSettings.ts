import {
  API_PATHS,
  DocumentSetting,
  DocumentSettingInput,
  DocumentType,
} from '../../types'

/**
 * @API_INTEGRATION
 * IPC: document-settings:list (API_PATHS.documentSettings.list)
 * リクエスト: なし
 * レスポンス: DocumentSetting[]（全書類種別）
 */
export async function listDocumentSettings(): Promise<DocumentSetting[]> {
  void API_PATHS.documentSettings.list
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: document-settings:update:${type} (API_PATHS.documentSettings.update)
 * リクエスト: type, DocumentSettingInput
 * レスポンス: DocumentSetting
 */
export async function updateDocumentSetting(
  type: DocumentType,
  input: DocumentSettingInput
): Promise<DocumentSetting> {
  void input
  void API_PATHS.documentSettings.update(type)
  throw new Error('API not implemented')
}
