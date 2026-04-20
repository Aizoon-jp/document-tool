import { API_PATHS, Company, CompanyInput } from '../../types'

/**
 * @API_INTEGRATION
 * IPC: company:get (API_PATHS.company.get)
 * リクエスト: なし
 * レスポンス: Company
 */
export async function getCompany(): Promise<Company> {
  void API_PATHS.company.get
  throw new Error('API not implemented')
}

/**
 * @API_INTEGRATION
 * IPC: company:update (API_PATHS.company.update)
 * リクエスト: CompanyInput
 * レスポンス: Company
 */
export async function updateCompany(input: CompanyInput): Promise<Company> {
  void input
  void API_PATHS.company.update
  throw new Error('API not implemented')
}
