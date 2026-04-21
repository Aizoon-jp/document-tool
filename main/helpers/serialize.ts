import type { DocumentOptions } from '../../renderer/types'

export function serializeOptions(options: DocumentOptions): string {
  return JSON.stringify(options)
}

export function deserializeOptions(raw: unknown): DocumentOptions {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as DocumentOptions
  }
  return raw as DocumentOptions
}

export function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}
