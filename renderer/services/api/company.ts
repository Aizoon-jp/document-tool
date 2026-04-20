import { API_PATHS, Company, CompanyInput } from '../../types'

export async function getCompany(): Promise<Company | null> {
  return window.ipc.invoke<Company | null>(API_PATHS.company.get)
}

export async function updateCompany(input: CompanyInput): Promise<Company> {
  return window.ipc.invoke<Company>(API_PATHS.company.update, input)
}
