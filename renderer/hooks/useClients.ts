import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
} from '../services/api/clients'
import type { ClientInput } from '../types'
import { queryKeys } from './queryKeys'

export const useClients = () =>
  useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: listClients,
  })

export const useCreateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ClientInput) => createClient(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all })
    },
  })
}

export const useUpdateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) =>
      updateClient(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all })
    },
  })
}

export const useDeleteClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all })
    },
  })
}
