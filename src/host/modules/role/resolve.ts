import type { RoleSource } from '../../../shared/contracts/role.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { defaultRoleText } from './defaults.ts'

export interface RoleResolutionInput {
  enabled: boolean
  bookEnabled: boolean
  globalText: string
  bookText: string
  language: WorkspaceLanguage
}

export interface ResolvedRole {
  text: string
  source: RoleSource
}

/** Book override wins only when enabled and non-empty; otherwise global, then default. */
export function resolveRole(input: RoleResolutionInput): ResolvedRole {
  const fallback = defaultRoleText(input.language)
  if (!input.enabled) return { text: fallback, source: 'default' }
  const book = input.bookText.trim()
  if (input.bookEnabled && book) return { text: book, source: 'book' }
  const global = input.globalText.trim()
  if (global) return { text: global, source: 'global' }
  return { text: fallback, source: 'default' }
}
