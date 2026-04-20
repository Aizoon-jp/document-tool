import type {
  DocumentFilter,
  DocumentSort,
  DocumentType,
} from '../types'

export const queryKeys = {
  company: ['company'] as const,
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  items: {
    all: ['items'] as const,
    detail: (id: string) => ['items', id] as const,
  },
  stamps: {
    all: ['stamps'] as const,
    detail: (id: string) => ['stamps', id] as const,
  },
  documentSettings: ['document-settings'] as const,
  documents: {
    all: ['documents'] as const,
    list: (sort?: DocumentSort) => ['documents', 'list', sort] as const,
    recent: (limit: number) => ['documents', 'recent', limit] as const,
    search: (filter: DocumentFilter, sort?: DocumentSort) =>
      ['documents', 'search', filter, sort] as const,
    monthlySummary: (yearMonth: string) =>
      ['documents', 'monthly-summary', yearMonth] as const,
    detail: (id: string) => ['documents', id] as const,
    lines: (id: string) => ['documents', id, 'lines'] as const,
    nextNumber: (type: DocumentType) =>
      ['documents', 'next-number', type] as const,
  },
} as const
