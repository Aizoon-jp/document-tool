import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listDocumentSettings,
  updateDocumentSetting,
} from '../services/api/documentSettings'
import type { DocumentSettingInput, DocumentType } from '../types'
import { queryKeys } from './queryKeys'

export const useDocumentSettings = () =>
  useQuery({
    queryKey: queryKeys.documentSettings,
    queryFn: listDocumentSettings,
  })

export const useUpdateDocumentSetting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      input,
    }: {
      type: DocumentType
      input: DocumentSettingInput
    }) => updateDocumentSetting(type, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documentSettings })
    },
  })
}
