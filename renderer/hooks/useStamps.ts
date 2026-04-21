import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStamp,
  deleteStamp,
  listStamps,
  updateStamp,
  type StampCreateInput,
  type StampUpdateInput,
} from '../services/api/stamps'
import { queryKeys } from './queryKeys'

export const useStamps = () =>
  useQuery({
    queryKey: queryKeys.stamps.all,
    queryFn: listStamps,
  })

export const useCreateStamp = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: StampCreateInput) => createStamp(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stamps.all })
    },
  })
}

export const useUpdateStamp = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StampUpdateInput }) =>
      updateStamp(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stamps.all })
    },
  })
}

export const useDeleteStamp = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStamp(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stamps.all })
    },
  })
}
