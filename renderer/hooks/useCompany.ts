import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCompany, updateCompany } from '../services/api/company'
import type { CompanyInput } from '../types'
import { queryKeys } from './queryKeys'

export const useCompany = () =>
  useQuery({
    queryKey: queryKeys.company,
    queryFn: getCompany,
  })

export const useUpdateCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CompanyInput) => updateCompany(input),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.company, data)
    },
  })
}
