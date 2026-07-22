import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clearApiKey,
  getApiKeyStatus,
  scanBusinessCard,
  setApiKey,
} from '../services/api/businessCard'
import { queryKeys } from './queryKeys'

export const useApiKeyStatus = () =>
  useQuery({
    queryKey: queryKeys.apiKey,
    queryFn: getApiKeyStatus,
  })

export const useSetApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => setApiKey(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKey })
    },
  })
}

export const useClearApiKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearApiKey(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKey })
    },
  })
}

export const useScanBusinessCard = () =>
  useMutation({
    mutationFn: (imageDataUrl: string) => scanBusinessCard(imageDataUrl),
  })
