import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  generateDocumentPdf,
  getDocument,
  getMonthlySummary,
  getNextDocumentNumber,
  listDocumentLines,
  listDocuments,
  listRecentDocuments,
  searchDocuments,
  updateDocument,
} from '../services/api/documents'
import type {
  DocumentDraft,
  DocumentFilter,
  DocumentSort,
  DocumentType,
} from '../types'
import { queryKeys } from './queryKeys'

export const useDocuments = (sort?: DocumentSort) =>
  useQuery({
    queryKey: queryKeys.documents.list(sort),
    queryFn: () => listDocuments(sort),
  })

export const useRecentDocuments = (limit = 5) =>
  useQuery({
    queryKey: queryKeys.documents.recent(limit),
    queryFn: () => listRecentDocuments(limit),
  })

export const useSearchDocuments = (
  filter: DocumentFilter,
  sort?: DocumentSort
) =>
  useQuery({
    queryKey: queryKeys.documents.search(filter, sort),
    queryFn: () => searchDocuments(filter, sort),
  })

export const useMonthlySummary = (yearMonth: string) =>
  useQuery({
    queryKey: queryKeys.documents.monthlySummary(yearMonth),
    queryFn: () => getMonthlySummary(yearMonth),
  })

export const useDocument = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.documents.detail(id ?? ''),
    queryFn: () => getDocument(id as string),
    enabled: Boolean(id),
  })

export const useDocumentLines = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.documents.lines(id ?? ''),
    queryFn: () => listDocumentLines(id as string),
    enabled: Boolean(id),
  })

export const useNextDocumentNumber = (
  type: DocumentType,
  clientId?: string
) =>
  useQuery({
    queryKey: queryKeys.documents.nextNumber(type, clientId),
    queryFn: () => getNextDocumentNumber(type, clientId),
  })

export const useCreateDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draft: DocumentDraft) => createDocument(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all })
    },
  })
}

export const useUpdateDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: DocumentDraft }) =>
      updateDocument(id, draft),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all })
      qc.invalidateQueries({
        queryKey: queryKeys.documents.detail(variables.id),
      })
    },
  })
}

export const useDeleteDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all })
    },
  })
}

export const useDuplicateDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all })
    },
  })
}

export const useGeneratePdf = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => generateDocumentPdf(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.documents.all })
    },
  })
}
