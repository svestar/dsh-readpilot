import type {
  BookWithProgress,
  ChapterContent,
  OpenBook as ApiOpenBook,
  OpenResult,
  OutlineItem as ApiOutlineItem,
  PageViewResult,
  ReaderState,
  SearchMatch as ApiSearchMatch,
  TocItem as ApiTocItem,
} from '../api.ts'
import type { NoteRecord } from '../notes.ts'
import type { NoteFileRecord, NoteHistoryEntry } from '../note-files.ts'
import type { NoteDraftRecord } from '../note-drafts.ts'

export type { CallRpc } from '../rpc.ts'

export type TextFn = (key: string) => string

export interface MutableRef<T> {
  current: T | null
}

export type ClientBook = BookWithProgress
export type Snapshot = ReaderState
export type TocItem = ApiTocItem
export type OutlineItem = ApiOutlineItem
export type OpenBook = ApiOpenBook
export type BookDetail = OpenResult
export type BookContent = ChapterContent
export type PageView = PageViewResult
export type SearchMatch = ApiSearchMatch

export type Screen =
  | { kind: 'library' }
  | { kind: 'setup' }
  | { kind: 'unsupported'; book: OpenBook }
  | { kind: 'book'; detail: BookDetail; content: BookContent }

export interface Selection {
  text: string
  blockIndex: number | null
  offset: number
  x: number
  y: number
}

export interface VisualPdf {
  kind: 'pdf'
  page: number
  scale: number
}

export interface VisualEpub {
  kind: 'epub'
  href: string
}

export type Visual = VisualPdf | VisualEpub

export type Note = NoteRecord
export type LongNote = NoteFileRecord
export type LongNoteHistory = NoteHistoryEntry
export type NoteDraft = NoteDraftRecord

export interface NoteContextToggle {
  enabled: boolean
  busy: boolean
  characters: number
  toggle: () => void
}

export interface NoteAutoApplyToggle {
  enabled: boolean
  busy: boolean
  toggle: () => void
}

export interface NoteEditor {
  noteId?: string
  kind: string
  chapterId: string
  blockIndex: number
  offset: number
  quote: string
  quotePrefix?: string
  quoteSuffix?: string
  textHash?: string
  start?: number
  end?: number
  blockHash?: string
}

export interface NoteRef {
  id: string
  bookId?: string | null
}

export interface SearchResults {
  matches: SearchMatch[]
  truncated: boolean
  booksScanned: number
  booksTotal: number
  unreadable: boolean
}

export interface ChatMessage {
  key: string
  role: 'user' | 'assistant'
  text: string
}

export interface SelectTarget {
  blockIndex?: number
  offset?: number
  flash?: boolean
}

/** Composer actions the host exposes to session-scoped slot bodies. */
export interface ComposerInputActions {
  insertQuote?: (text: string) => boolean
  setDraft?: (text: string) => void
}

export type SelectChapter = (bookId: string, chapterId: string, target?: SelectTarget) => Promise<void>

export interface PendingScroll {
  chapterId: string
  blockIndex: number | null
  flash: boolean
}
