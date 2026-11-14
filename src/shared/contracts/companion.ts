export interface SessionRecord {
  sessionId: string
  updatedAt: number
}

export type SessionMap = Record<string, SessionRecord>

export const COMPANION_ENDPOINTS = {
  session: 'session',
  sessionAlive: 'sessionAlive',
  sessionBook: 'sessionBook',
  companionPolicy: 'companionPolicy',
  companionContext: 'companionContext',
} as const

export interface CompanionReadingView {
  mode?: 'paged' | 'scroll'
  pageStart?: number
  pageEnd?: number
  pageTotal?: number
  chapterIndex?: number
  chapterTotal?: number
  selection?: string
  selectionBlockIndex?: number
  selectionOffset?: number
}

export interface SessionBookResult {
  bookId: string
  title: string
  format: string
  progress: import('./library.ts').ReadingProgress | null
}

export function normalizeReadingView(value: unknown): CompanionReadingView | undefined {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  const view: CompanionReadingView = {}
  if (source.mode === 'paged' || source.mode === 'scroll') view.mode = source.mode
  const positive = (input: unknown): number | undefined =>
    Number.isInteger(input) && Number(input) > 0 ? Number(input) : undefined
  const nonNegative = (input: unknown): number | undefined =>
    Number.isInteger(input) && Number(input) >= 0 ? Number(input) : undefined
  const pageStart = positive(source.pageStart)
  const pageEnd = positive(source.pageEnd)
  const pageTotal = positive(source.pageTotal)
  if (pageStart !== undefined) view.pageStart = pageStart
  if (pageEnd !== undefined) view.pageEnd = pageEnd
  if (pageTotal !== undefined) view.pageTotal = pageTotal
  const chapterIndex = nonNegative(source.chapterIndex)
  const chapterTotal = positive(source.chapterTotal)
  if (chapterIndex !== undefined) view.chapterIndex = chapterIndex
  if (chapterTotal !== undefined) view.chapterTotal = chapterTotal
  if (typeof source.selection === 'string' && source.selection.trim()) {
    view.selection = source.selection.trim().slice(0, 4000)
    const blockIndex = nonNegative(source.selectionBlockIndex)
    const offset = nonNegative(source.selectionOffset)
    if (blockIndex !== undefined) view.selectionBlockIndex = blockIndex
    if (offset !== undefined) view.selectionOffset = offset
  }
  return Object.keys(view).length > 0 ? view : undefined
}

export type MemoryMode = 'off' | 'on'
export type BookMemoryState = 'inherit' | 'on' | 'off'

export interface CompanionMemorySettings {
  mode: MemoryMode
  books: Record<string, BookMemoryState>
}

export interface CompanionSettings {
  notes: Record<string, boolean>
  memory: CompanionMemorySettings
  autoApplyNotes: boolean
}

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  notes: {},
  memory: { mode: 'off', books: {} },
  autoApplyNotes: false,
}

/** Memory is opt-in: the global switch and the per-book override must both allow it. */
export function effectiveMemoryState(settings: CompanionSettings, bookId: string): 'on' | 'off' {
  const mode = settings.memory.mode
  const state = settings.memory.books[bookId]
  if (mode === 'off') return 'off'
  if (state === 'off') return 'off'
  if (state === 'on') return 'on'
  return mode === 'on' ? 'on' : 'off'
}
