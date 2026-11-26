export interface SessionRecord {
  sessionId: string
  updatedAt: number
}

export type SessionMap = Record<string, SessionRecord>

export const COMPANION_ENDPOINTS = {
  session: 'session',
  sessionAlive: 'sessionAlive',
  sessionBook: 'sessionBook',
  companionSessions: 'companionSessions',
  companionPolicy: 'companionPolicy',
  companionContext: 'companionContext',
} as const

export interface CompanionSessionSummary {
  sessionId: string
  title: string
  updatedAt: number
  boundBookId: string | null
  boundBookTitle: string | null
}

export interface CompanionSessionList {
  currentSessionId: string | null
  sessions: CompanionSessionSummary[]
}

export interface CompanionSessionBinding {
  bookId: string
  sessionId: string | null
  unboundBookIds: string[]
}

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
export type BookNoteState = 'inherit' | 'on' | 'off'

export interface CompanionMemorySettings {
  mode: MemoryMode
  books: Record<string, BookMemoryState>
}

export interface CompanionRoleSettings {
  /** Whether custom role cards may replace the default reading assistant. */
  enabled: boolean
  /** Books that explicitly use their own role card instead of the global one. */
  books: Record<string, boolean>
}

export interface CompanionSettings {
  notes: Record<string, boolean>
  notesGlobal?: boolean
  memory: CompanionMemorySettings
  roles: CompanionRoleSettings
  autoApplyNotes: boolean
}

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  notes: {},
  notesGlobal: false,
  memory: { mode: 'off', books: {} },
  roles: { enabled: true, books: {} },
  autoApplyNotes: false,
}

/** The global switch gates every book; with it on, a per-book false opts out. */
export function effectiveNotesEnabled(settings: CompanionSettings, bookId: string): boolean {
  return settings.notesGlobal === true && settings.notes[bookId] !== false
}

export function noteBookState(settings: CompanionSettings, bookId: string): BookNoteState {
  const value = settings.notes[bookId]
  return value === true ? 'on' : value === false ? 'off' : 'inherit'
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
