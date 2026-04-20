import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createItem,
  deleteItem,
  listItems,
  updateItem,
} from '../services/api/items'
import type { ItemInput } from '../types'
import { queryKeys } from './queryKeys'

export const useItems = () =>
  useQuery({
    queryKey: queryKeys.items.all,
    queryFn: listItems,
  })

export const useCreateItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ItemInput) => createItem(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export const useUpdateItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ItemInput }) =>
      updateItem(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}

export const useDeleteItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all })
    },
  })
}
