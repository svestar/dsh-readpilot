import type { BookFormat, TextBlock } from '../formats.ts'
import type { NoteRecord } from '../notes.ts'
import type { ReadingProgress, SessionRecord, Settings } from '../store.ts'
import type { PdfTextItem } from '../visual/pdf.ts'

export type TextFn = (key: string) => string

export interface MutableRef<T> {
  current: T | null
}

export interface ClientBook {
  id: string
  title: string
  path: string
  format: BookFormat
  supported: boolean
  size: number
  mtimeMs: number
  progress: ReadingProgress | null
}

export interface Snapshot {
  settings: Settings
  books: ClientBook[]
  tags: Record<string, string[]>
  sessions: Record<string, SessionRecord>
}

export interface TocItem {
  id: string
  title: string
  chars: number
  page?: number
  href?: string
}

export interface OutlineItem {
  id: string
  title: string
  level: number
  page: number
  chapterId?: string
}

export interface OpenBook {
  id: string
  title: string
  path: string
  format: BookFormat
  supported: boolean
  size: number
  mtimeMs: number
  author?: string
}

export interface BookDetail {
  book: OpenBook
  supported: boolean
  toc: TocItem[]
  outline?: OutlineItem[]
  progress: ReadingProgress | null
}

export interface BookContent {
  chapterId: string
  title: string
  blocks: TextBlock[]
  locator: string
}

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

export interface PageView {
  width: number
  height: number
  pageCount: number
  textItems: PdfTextItem[]
}

export type Note = NoteRecord

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
}

export interface NoteRef {
  id: string
  bookId?: string | null
}

export interface SearchMatch {
  bookId?: string
  bookTitle?: string
  chapterId: string
  chapterTitle: string
  offset: number
  snippet: string
  locator?: string
}

export interface SearchResults {
  matches: SearchMatch[]
  truncated: boolean
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

export type SelectChapter = (bookId: string, chapterId: string, target?: SelectTarget) => Promise<void>

export type CallRpc = (endpoint: string, payload?: unknown) => Promise<any>

export interface PendingScroll {
  chapterId: string
  blockIndex: number | null
  flash: boolean
}
