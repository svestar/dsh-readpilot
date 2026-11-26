export const ROLE_ENDPOINT = 'role'

export type RoleScope = 'global' | 'book'
export type RoleSource = 'book' | 'global' | 'default'

export interface RoleCardView {
  text: string
  characters: number
}

export interface RoleHistoryView extends RoleCardView {
  id: string
  createdAt: number
}

export interface RoleState {
  enabled: boolean
  bookEnabled: boolean
  bookId: string
  globalText: string
  bookText: string
  defaultText: string
  effectiveText: string
  effectiveSource: RoleSource
  globalHistory: RoleHistoryView[]
  bookHistory: RoleHistoryView[]
}
