import type { BookFormat, TextBlock } from '../books/formats.ts'
import type { BackupExportResult, BackupRestoreResult } from '../backup/index.ts'
import type { Book } from '../books/library.ts'
import type { LibraryMeta } from '../books/library-meta.ts'
import type { RatingMap, ReadStatus, StatusMap, TagMap } from '../books/library-meta.ts'
import type { CompanionSettings } from '../companion/settings.ts'
import type { ReaderAction, ReaderActionInput, ReaderActionReceipt, ReaderReceiptInput } from '../reading/actions.ts'
import type { NoteDraftRecord } from '../notes/drafts.ts'
import type { ProgressMap, ReadingProgress, SessionMap, Settings } from '../storage/store.ts'
import type { EpubAssetResult, EpubDocumentResult } from '../visual/epub.ts'
import type { PdfTextItem } from '../visual/pdf.ts'

export interface ReaderContext {
  get(name: string): any
}

export interface ReaderConfig {
  maxBookBytes?: number
}

export interface ReaderApiOptions {
  ctx: ReaderContext
  dataDir: string
  config?: ReaderConfig
}

export interface BookWithProgress extends Book {
  progress: ReadingProgress | null
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

export interface SessionBookResult {
  bookId: string
  title: string
  format: BookFormat
  progress: ReadingProgress | null
}

export interface ReaderState {
  settings: Settings
  books: BookWithProgress[]
  progress: ProgressMap
  sessions: SessionMap
  tags: TagMap
  status: StatusMap
  rating: RatingMap
  companion: CompanionSettings
}

export interface OpenBook extends Book {
  author?: string
}

export interface OpenResult {
  book: OpenBook
  supported: boolean
  toc: TocItem[]
  outline?: OutlineItem[]
  progress: ReadingProgress | null
  reflowConfidence?: number
  reflowNotes?: string[]
  scanOnly?: boolean
  pageCount?: number
}

export interface ChapterContent {
  chapterId: string
  title: string
  blocks: TextBlock[]
  locator: string
}

export interface SearchMatch {
  bookId: string
  bookTitle: string
  chapterId: string
  chapterTitle: string
  offset: number
  snippet: string
  locator: string
  jumpUrl: string
}

export interface SearchResult {
  matches: SearchMatch[]
  truncated: boolean
  query: string
  booksScanned: number
  booksTotal: number
  unreadable: boolean
}

export interface PageViewResult {
  width: number
  height: number
  pageCount: number
  textItems: PdfTextItem[]
}

export interface RpcError {
  code: string
  message: string
  details: Record<string, unknown>
}

export interface RpcResult {
  ok: boolean
  value?: any
  error?: RpcError
}

export interface ReaderApi {
  state(): Promise<ReaderState>
  rescan(): Promise<ReaderState>
  dispose(): Promise<void>
  syncPrompt(): Promise<void>
  configureLibrary(payload?: { path?: unknown }): Promise<ReaderState>
  deleteDuplicate(payload?: { bookId?: unknown }): Promise<ReaderState>
  backupExport(): Promise<BackupExportResult>
  backupRestore(payload?: { archivePath?: unknown; libraryPath?: unknown }): Promise<BackupRestoreResult & { state: ReaderState }>
  open(payload?: { bookId?: unknown }): Promise<OpenResult>
  chapter(payload?: { bookId?: unknown; chapterId?: unknown }): Promise<ChapterContent>
  saveReadingProgress(payload?: any): Promise<{ bookId: string; chapterId: string }>
  sessionBook(payload?: { sessionId?: unknown }): Promise<SessionBookResult | null>
  setCompanionSession(payload?: any): Promise<{ bookId: string; sessionId: string | null }>
  sessionAlive(payload?: { sessionId?: unknown }): Promise<{ sessionId: string; alive: boolean }>
  setCompanionPolicy(payload?: { sessionId?: unknown }): Promise<{ sessionId: string; mode: string | null; applied: boolean }>
  setCompanionContext(payload?: any): Promise<{ sessionId: string; characters: number }>
  syncCompanionContexts(): Promise<void>
  companionContextOf(sessionId: unknown): string
  setNoteContext(payload?: any): Promise<{ bookId: string; enabled: boolean; characters: number }>
  setAutoApplyNotes(payload?: { enabled?: unknown }): Promise<{ enabled: boolean }>
  notesContextFor(sessionId: unknown): string
  memory(payload?: any): Promise<any>
  memoryTool(payload?: any): Promise<any>
  memoryContextFor(sessionId: unknown): string
  prompts(payload?: any): Promise<any>
  readerActions(payload?: any): Promise<any>
  readerReceipts(payload?: any): Promise<any>
  pushReaderAction(action: ReaderActionInput): Promise<ReaderAction>
  recordReaderReceipt(input: ReaderReceiptInput): Promise<ReaderActionReceipt>
  noteDrafts(payload?: any): Promise<any>
  noteDraftCreate(payload?: any): Promise<{
    draft: NoteDraftRecord
    autoApplied?: boolean
    note?: { id: string; title: string }
    characters?: number
    error?: string
  }>
  toolNoteFiles(payload?: any): Promise<any>
  openNoteFile(payload?: any): Promise<{ opened: boolean; path: string }>
  exportNotes(payload?: any): Promise<{ markdown: string; fileName: string; path?: string }>
  search(payload?: any): Promise<SearchResult>
  libraryMeta(): Promise<LibraryMeta>
  setBookTags(payload?: { bookId?: unknown; tags?: unknown }): Promise<{ bookId: string; tags: string[] }>
  setBookStatus(payload?: { bookId?: unknown; status?: unknown }): Promise<{ bookId: string; status: ReadStatus | null }>
  setBookRating(payload?: { bookId?: unknown; rating?: unknown }): Promise<{ bookId: string; rating: number | null }>
  toolBooks(): Promise<any>
  toolOpen(payload?: any): Promise<any>
  toolDigest(payload?: any): Promise<any>
  toolContext(payload?: any): Promise<any>
  toolRead(payload?: any): Promise<any>
  toolSearch(payload?: any): Promise<any>
  toolNote(payload?: any): Promise<any>
  pageView(payload?: any): Promise<PageViewResult>
  pdfPage(payload?: any): Promise<{ png: Buffer; contentType: string }>
  cover(payload?: any): Promise<{ bytes: Buffer; contentType: string }>
  epubDocument(payload?: any): Promise<EpubDocumentResult>
  epubAsset(payload?: any): Promise<EpubAssetResult>
  bookAsset(payload?: any): Promise<{ bytes: Buffer; contentType: string }>
  handleRpc(endpoint: string, payload?: unknown): Promise<RpcResult>
}
