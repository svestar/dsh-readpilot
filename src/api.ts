import { spawn } from 'node:child_process'
import { mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Chapter, LibraryFormat, TextBlock } from './formats.ts'
import { chapterText, isSupportedFormat, parseBookAsync } from './formats.ts'
import { buildBookDigest } from './digest.ts'
import { exportBackup, restoreBackup } from './backup.ts'
import type { BackupExportResult, BackupRestoreResult } from './backup.ts'
import type { Book } from './library.ts'
import { findBookByKey, scanLibrary } from './library.ts'
import {
  deleteLibraryRecord,
  loadLibraryIndex,
  reconcileBooks,
  saveLibraryIndex,
} from './library-index.ts'
import type { LibraryMeta, RatingMap, ReadStatus, StatusMap, TagMap } from './library-meta.ts'
import { createLibraryMetaStore } from './library-meta.ts'
import { createDraftHandlers } from './api-drafts.ts'
import { createMemoryHandlers } from './api-memory.ts'
import { createNoteFileHandlers } from './api-note-files.ts'
import { createNotesHandlers } from './api-notes.ts'
import { createPromptHandlers } from './api-prompts.ts'
import type { ReaderAction, ReaderActionInput, ReaderActionReceipt, ReaderReceiptInput, ReaderActionType } from './reader-actions.ts'
import { createReaderActionStore } from './reader-actions.ts'
import { createLimiter } from './limit.ts'
import { ReaderError } from './reader-error.ts'
import { enqueueWrite } from './write-queue.ts'
import type { NotesStore } from './notes.ts'
import { createNotesStore } from './notes.ts'
import { NOTES_DIR_NAME } from './note-files.ts'
import { buildReaderJumpUrl } from './jump-url.ts'
import type { CompanionSettings } from './companion-settings.ts'
import { effectiveMemoryState, loadCompanionSettings, saveCompanionSettings } from './companion-settings.ts'
import type { BaseEndpoint } from './contract.ts'
import type { MemoryStore } from './memory-store.ts'
import { createMemoryStore } from './memory-store.ts'
import type { NoteDraftRecord, NoteDraftStore } from './note-drafts.ts'
import { createNoteDraftStore } from './note-drafts.ts'
import type { PromptPresetStore } from './prompt-presets.ts'
import { createPromptPresetStore } from './prompt-presets.ts'
import type { ExportLongNote, ExportMark } from './note-export.ts'
import { buildNotesMarkdown } from './note-export.ts'
import { buildReadingNotes } from './notes-context.ts'
import type { ReadingHighlight, ReadingNote } from './notes-context.ts'
import type { BookCacheRecord, ProgressMap, ReadingProgress, SessionMap, Settings } from './store.ts'
import {
  cachePath,
  loadBookCache,
  loadProgress,
  loadSessions,
  loadSettings,
  saveBookCache,
  saveProgress,
  saveSessions,
  saveSettings,
} from './store.ts'
import type { EpubAssetResult, EpubDocumentResult, EpubVisual } from './visual/epub.ts'
import type { PdfRenderer, PdfTextItem } from './visual/pdf.ts'
import { ensureWorkspacePrompt } from './workspace-prompt.ts'

const PARSER_VERSION = 12
const APP_VERSION = '0.4.0-dev'
const DEFAULT_MAX_BOOK_BYTES = 100 * 1024 * 1024
const DEFAULT_READ_LIMIT = 4000
const MAX_READ_LIMIT = 8000
const PDF_COVER_SCALE = 0.5
const MAX_CONCURRENT_COVERS = 4
const coverLimit = createLimiter(MAX_CONCURRENT_COVERS)
const MAX_SEARCH_BOOKS = 20
const MAX_SEARCH_RESULTS = 5000
const MAX_SEARCH_PARSE_BYTES = 128 * 1024 * 1024
const MAX_SEARCH_PARSE_MS = 3000
const SCAN_TTL_MS = 30_000
const MAX_BOOK_IMAGE_BYTES = 20 * 1024 * 1024
const BOOK_IMAGE_TYPES = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.svg', 'image/svg+xml'],
])

export interface ReaderContext {
  get(name: string): any
}

export interface ReaderConfig {
  maxBookBytes?: number
}

function openWithExternalEditor(path: string): Promise<void> {
  const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  return new Promise((resolve, reject) => {
    const child = spawn(command, [path], { detached: true, stdio: 'ignore', windowsHide: false })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
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
  format: LibraryFormat
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

export { ReaderError } from './reader-error.ts'

export function noteFilePath(libraryDir: string, notePath: string): string {
  const notesRoot = resolve(libraryDir, NOTES_DIR_NAME)
  const target = resolve(libraryDir, notePath)
  if (target !== notesRoot && !target.startsWith(`${notesRoot}${sep}`)) {
    throw new ReaderError('invalid-note', '笔记路径越界')
  }
  return target
}

function positiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : fallback
}

export function createReaderApi({ ctx, dataDir, config = {} }: ReaderApiOptions): ReaderApi {
  const maxBookBytes = positiveInteger(config.maxBookBytes, DEFAULT_MAX_BOOK_BYTES)
  const notesStore: NotesStore = createNotesStore(dataDir)
  const libraryMetaStore = createLibraryMetaStore(dataDir)
  const readOnlySessions = new Set<string>()
  const companionContexts = new Map<string, { text: string; updatedAt: number }>()
  const companionReadings = new Map<string, { bookId: string; title: string; chapter: string; view?: CompanionReadingView; updatedAt: number }>()
  const notesContextCache = new Map<string, { text: string; characters: number; updatedAt: number }>()
  let companionSettings: CompanionSettings = { notes: {}, memory: { mode: 'off', books: {} }, autoApplyNotes: false }
  const memoryStore: MemoryStore = createMemoryStore(dataDir)
  const memoryCache = new Map<string, { text: string; characters: number; updatedAt: number }>()
  let pdfRendererPromise: Promise<PdfRenderer> | undefined
  let epubVisualPromise: Promise<EpubVisual> | undefined

  async function getPdfRenderer(): Promise<PdfRenderer> {
    if (!pdfRendererPromise) {
      pdfRendererPromise = import('./visual/pdf.ts').then(({ createPdfPageRenderer }) =>
        createPdfPageRenderer({ cacheDir: join(dataDir, 'cache', 'pages') }))
    }
    return pdfRendererPromise
  }

  async function getEpubVisual(): Promise<EpubVisual> {
    if (!epubVisualPromise) {
      epubVisualPromise = import('./visual/epub.ts').then(({ createEpubVisual }) =>
        createEpubVisual({ dataDir }))
    }
    return epubVisualPromise
  }

  async function currentSettings(): Promise<Settings> {
    return loadSettings(dataDir)
  }

  let scanCache: { dir: string; at: number; books: Book[] } | null = null
  let scanInflight: { dir: string; promise: Promise<Book[]> } | null = null
  let libraryWatch: { dir: string; controller: AbortController; close: () => Promise<void> } | null = null
  let watchAttemptedDir: string | null = null

  function invalidateScan(): void {
    scanCache = null
    scanInflight = null
  }

  async function refreshLibraryWatch(dir: string | null): Promise<void> {
    if (libraryWatch?.dir === dir) return
    if (!libraryWatch && watchAttemptedDir === dir) return
    const previous = libraryWatch
    libraryWatch = null
    if (previous) {
      previous.controller.abort()
      await previous.close().catch(() => {})
    }
    if (!dir) {
      watchAttemptedDir = null
      return
    }
    watchAttemptedDir = dir
    const fs = typeof ctx.get === 'function' ? ctx.get('fs') : undefined
    if (!fs || typeof fs.resolve !== 'function' || typeof fs.watch !== 'function') return
    try {
      const target = await fs.resolve(dir)
      const controller = new AbortController()
      const close = await fs.watch(target, () => invalidateScan(), controller.signal)
      libraryWatch = { dir, controller, close }
    } catch {
      // Watching is an optimization; the 30s TTL remains the fallback.
    }
  }

  async function dispose(): Promise<void> {
    const current = libraryWatch
    libraryWatch = null
    watchAttemptedDir = null
    if (!current) return
    current.controller.abort()
    await current.close().catch(() => {})
  }

  async function libraryBooks(options: { fresh?: boolean } = {}): Promise<Book[]> {
    const settings = await currentSettings()
    const dir = settings.libraryDir
    if (!dir) {
      invalidateScan()
      return []
    }
    const now = Date.now()
    if (!options.fresh && scanCache && scanCache.dir === dir && now - scanCache.at < SCAN_TTL_MS) {
      return scanCache.books
    }
    if (!options.fresh && scanInflight && scanInflight.dir === dir) return scanInflight.promise
    const promise = scanLibrary(dir)
      .then(async books => {
        const index = await loadLibraryIndex(dataDir)
        const reconciled = reconcileBooks(books, index)
        await enqueueWrite(`library-index:${dataDir}`, () => saveLibraryIndex(dataDir, index))
        scanCache = { dir, at: Date.now(), books: reconciled }
        return reconciled
      })
      .finally(() => {
        if (scanInflight?.promise === promise) scanInflight = null
      })
    if (!options.fresh) scanInflight = { dir, promise }
    return promise
  }

  async function rescan(): Promise<ReaderState> {
    invalidateScan()
    return state()
  }

  async function bookHasUserData(book: Book): Promise<boolean> {
    const [notes, progress, sessions, meta] = await Promise.all([
      notesStore.list(book.id),
      loadProgress(dataDir),
      loadSessions(dataDir),
      libraryMetaStore.list(),
    ])
    const hasMeta = Boolean(meta.tags[book.id] || meta.status[book.id] || meta.rating[book.id])
    let hasLongNotes = false
    try {
      const store = await ensureNoteFileStore()
      hasLongNotes = (await store.list(book)).length > 0
    } catch {
      // A broken note store must not block duplicate handling.
    }
    return notes.length > 0 || Boolean(progress[book.id]) || Boolean(sessions[book.id]) || hasMeta || hasLongNotes
  }

  async function bookFileTarget(book: Book): Promise<string> {
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const root = await realpath(settings.libraryDir)
    const target = await realpath(book.path)
    const rel = relative(root, target)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
      throw new ReaderError('invalid-path', '只能删除书库目录内的书籍文件')
    }
    return target
  }

  async function deleteDuplicate({ bookId }: any = {}): Promise<ReaderState> {
    const books = await libraryBooks()
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(bookId)}`)
    const group = books.filter(candidate => candidate.contentKey === book.contentKey)
    if (group.length < 2) throw new ReaderError('not-duplicate', '这本书没有同内容副本')

    const index = await loadLibraryIndex(dataDir)
    if (book.duplicateOf) {
      if (await bookHasUserData(book)) {
        throw new ReaderError('duplicate-has-data', '副本已有批注、进度或笔记，不能直接删除；请保留两份')
      }
      await rm(await bookFileTarget(book))
      deleteLibraryRecord(index, book.id)
      await enqueueWrite(`library-index:${dataDir}`, () => saveLibraryIndex(dataDir, index))
      await rm(cachePath(dataDir, book.id), { force: true }).catch(() => undefined)
    } else {
      const replacement = group.find(candidate => candidate.id !== book.id)
      if (!replacement) throw new ReaderError('not-duplicate', '没有可提升的副本')
      if (await bookHasUserData(replacement)) {
        throw new ReaderError('duplicate-has-data', '剩余副本已有批注、进度或笔记，不能删除主记录；请改为删除该副本')
      }
      await rm(await bookFileTarget(book))
      const record = index.records[book.id]
      if (record) {
        record.path = replacement.path
        record.title = replacement.title
        record.size = replacement.size
        record.mtimeMs = replacement.mtimeMs
        record.duplicateOf = undefined
      }
      deleteLibraryRecord(index, replacement.id)
      await enqueueWrite(`library-index:${dataDir}`, () => saveLibraryIndex(dataDir, index))
    }

    invalidateScan()
    return state()
  }

  async function backupExport(): Promise<BackupExportResult> {
    const settings = await currentSettings()
    return exportBackup(dataDir, settings.libraryDir, await libraryBooks(), APP_VERSION)
  }

  async function backupRestore({ archivePath, libraryPath }: any = {}): Promise<BackupRestoreResult & { state: ReaderState }> {
    if (typeof archivePath !== 'string' || !archivePath.trim() || !isAbsolute(archivePath)) {
      throw new ReaderError('invalid-backup', '备份文件必须是绝对路径')
    }
    if (typeof libraryPath !== 'string' || !libraryPath.trim() || !isAbsolute(libraryPath)) {
      throw new ReaderError('invalid-path', '目标书库必须是绝对路径')
    }
    const archive = await realpath(archivePath.trim())
    const archiveInfo = await stat(archive)
    if (!archiveInfo.isFile()) throw new ReaderError('invalid-backup', '备份路径不是文件')
    const library = await realpath(libraryPath.trim())
    const libraryInfo = await stat(library)
    if (!libraryInfo.isDirectory()) throw new ReaderError('invalid-path', '目标书库不是目录')
    const targetBooks = reconcileBooks(await scanLibrary(library), await loadLibraryIndex(dataDir))
    const result = await restoreBackup(archive, dataDir, library, targetBooks, APP_VERSION)
    let next: ReaderState
    try {
      next = await configureLibrary({ path: library })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ReaderError('workspace-bind-failed', `${message}（数据已恢复，恢复前快照：${result.snapshotPath}）`)
    }
    return { ...result, state: next }
  }

  let promptDir: string | null = null

  async function syncWorkspacePrompt(settings: Settings): Promise<void> {
    if (!settings.libraryDir || promptDir === settings.libraryDir) return
    try {
      await ensureWorkspacePrompt(settings.libraryDir)
      promptDir = settings.libraryDir
    } catch {
      // A read-only or removed library must not make the whole library page fail.
    }
  }

  async function syncPrompt(): Promise<void> {
    const settings = await currentSettings()
    await syncWorkspacePrompt(settings)
  }

  async function state(): Promise<ReaderState> {
    const settings = await currentSettings()
    await syncWorkspacePrompt(settings)
    await refreshLibraryWatch(settings.libraryDir || null)
    const [books, progress, sessions, meta, companion] = await Promise.all([
      libraryBooks(),
      loadProgress(dataDir),
      loadSessions(dataDir),
      libraryMetaStore.list(),
      loadCompanionSettings(dataDir),
    ])
    companionSettings = companion
    const archived = new Set(archivedSessionIds())
    if (archived.size > 0) {
      for (const [bookId, entry] of Object.entries(sessions)) {
        if (archived.has(entry.sessionId)) delete sessions[bookId]
      }
    }
    return {
      settings,
      books: books.map(book => ({ ...book, progress: progress[book.id] ?? null })),
      progress,
      sessions,
      tags: meta.tags,
      status: meta.status,
      rating: meta.rating,
      companion,
    }
  }

  async function configureLibrary({ path }: { path?: unknown } = {}): Promise<ReaderState> {
    if (typeof path !== 'string' || !path.trim()) {
      throw new ReaderError('invalid-path', '书库路径不能为空')
    }
    const requested = path.trim()
    if (!isAbsolute(requested)) {
      throw new ReaderError('invalid-path', '书库路径必须是绝对路径')
    }
    const target = resolve(requested)
    await mkdir(target, { recursive: true })
    const info = await stat(target)
    if (!info.isDirectory()) {
      throw new ReaderError('invalid-path', '书库路径不是目录')
    }
    const real = await realpath(target)
    const registry: any = ctx.get('workspaceRegistry')
    if (!registry) {
      throw new ReaderError('workspace-unavailable', '当前环境没有工作区服务，无法创建书库工作区')
    }
    let workspace = await registry.resolveByPath(real)
    if (!workspace) {
      workspace = await registry.create(real, basename(real) || '书库')
    }
    await saveSettings(dataDir, {
      libraryDir: real,
      workspaceId: String(workspace.id),
      title: workspace.title ?? (basename(real) || '书库'),
    })
    invalidateScan()
    return state()
  }

  async function libraryMeta(): Promise<LibraryMeta> {
    return libraryMetaStore.list()
  }

  async function setBookTags({ bookId, tags }: { bookId?: unknown; tags?: unknown } = {}): Promise<{ bookId: string; tags: string[] }> {
    const book = await resolveBook(bookId)
    let normalized: string[]
    try {
      normalized = await libraryMetaStore.setTags(book.id, tags)
    } catch (error) {
      throw new ReaderError('invalid-tags', error instanceof Error ? error.message : String(error))
    }
    return { bookId: book.id, tags: normalized }
  }

  async function setBookStatus({ bookId, status }: { bookId?: unknown; status?: unknown } = {}): Promise<{ bookId: string; status: ReadStatus | null }> {
    const book = await resolveBook(bookId)
    let normalized: ReadStatus | null
    try {
      normalized = await libraryMetaStore.setStatus(book.id, status)
    } catch (error) {
      throw new ReaderError('invalid-status', error instanceof Error ? error.message : String(error))
    }
    return { bookId: book.id, status: normalized }
  }

  async function setBookRating({ bookId, rating }: { bookId?: unknown; rating?: unknown } = {}): Promise<{ bookId: string; rating: number | null }> {
    const book = await resolveBook(bookId)
    let normalized: number | null
    try {
      normalized = await libraryMetaStore.setRating(book.id, rating)
    } catch (error) {
      throw new ReaderError('invalid-rating', error instanceof Error ? error.message : String(error))
    }
    return { bookId: book.id, rating: normalized }
  }

  async function resolveBook(bookId: unknown): Promise<Book> {
    const books = await libraryBooks()
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(bookId)}`)
    return book
  }

  async function ensureParsed(book: Book): Promise<BookCacheRecord> {
    if (!isSupportedFormat(book.format)) {
      throw new ReaderError('unsupported-format', `暂不支持 ${book.format} 格式，当前支持 txt 与 md`)
    }
    const cached = await loadBookCache(dataDir, book.id)
    if (
      cached
      && cached.parserVersion === PARSER_VERSION
      && cached.source
      && cached.source.mtimeMs === book.mtimeMs
      && cached.source.size === book.size
    ) {
      return cached
    }
    const info = await stat(book.path)
    if (info.size > maxBookBytes) {
      throw new ReaderError('book-too-large', `书籍超过 ${Math.round(maxBookBytes / 1024 / 1024)} MB 限制`)
    }
    const buffer = await readFile(book.path)
    const parsed = await parseBookAsync(buffer, book.format, book.path)
    const record: BookCacheRecord = {
      parserVersion: PARSER_VERSION,
      source: { path: book.path, mtimeMs: info.mtimeMs, size: info.size },
      ...parsed,
    }
    await saveBookCache(dataDir, book.id, record)
    return record
  }

  async function open({ bookId }: { bookId?: unknown } = {}): Promise<OpenResult> {
    const book = await resolveBook(bookId)
    const progress = (await loadProgress(dataDir))[book.id] ?? null
    if (!book.supported) {
      return { book, supported: false, toc: [], progress }
    }
    const parsed = await ensureParsed(book)
    if (parsed.chapters.length === 0) {
      if (book.format === 'pdf' && (parsed.pageCount ?? 0) > 0) {
        return {
          book: { ...book, title: parsed.title || book.title, author: parsed.author || '' },
          supported: true,
          toc: [{ id: 'scan', title: parsed.title || book.title, chars: 0, page: 1 }],
          outline: (Array.isArray(parsed.outline) ? parsed.outline : []).map(item => ({
            id: item.id,
            title: item.title,
            level: item.level,
            page: item.page,
          })),
          progress,
          scanOnly: true,
          pageCount: parsed.pageCount,
        }
      }
      throw new ReaderError(
        'no-extractable-text',
        book.format === 'pdf'
          ? '这个 PDF 没有可提取的文本层；扫描版需要 OCR，当前不支持'
          : '这本书没有可提取的文本',
      )
    }
    const visibleChapters = parsed.chapters.filter(chapter => !chapter.skip)
    const tocSource = visibleChapters.length > 0 ? visibleChapters : parsed.chapters
    const chapterByPage = new Map<number, Chapter>()
    for (const chapter of parsed.chapters) {
      if (Number.isInteger(chapter.page) && !chapterByPage.has(chapter.page as number)) {
        chapterByPage.set(chapter.page as number, chapter)
      }
    }
    return {
      book: { ...book, title: parsed.title || book.title, author: parsed.author || '' },
      supported: true,
      toc: tocSource.map(chapter => {
        const item: TocItem = { id: chapter.id, title: chapter.title, chars: chapter.chars }
        if (Number.isInteger(chapter.page)) item.page = chapter.page
        if (typeof chapter.href === 'string') item.href = chapter.href
        return item
      }),
      outline: (Array.isArray(parsed.outline) ? parsed.outline : []).map(item => {
        const chapter = chapterByPage.get(item.page)
        const outlineItem: OutlineItem = {
          id: item.id,
          title: item.title,
          level: item.level,
          page: item.page,
          ...(chapter ? { chapterId: chapter.id } : {}),
        }
        return outlineItem
      }),
      progress,
      ...(typeof parsed.reflowConfidence === 'number' ? { reflowConfidence: parsed.reflowConfidence } : {}),
      ...(parsed.reflowNotes?.length ? { reflowNotes: parsed.reflowNotes } : {}),
    }
  }

  async function loadChapter({ bookId, chapterId }: { bookId?: unknown; chapterId?: unknown } = {}): Promise<{ book: Book; parsed: BookCacheRecord; chapter: Chapter }> {
    const book = await resolveBook(bookId)
    const parsed = await ensureParsed(book)
    const chapter = parsed.chapters.find(candidate => candidate.id === chapterId) ?? parsed.chapters[0]
    if (!chapter) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    return { book, parsed, chapter }
  }

  async function chapter({ bookId, chapterId }: { bookId?: unknown; chapterId?: unknown } = {}): Promise<ChapterContent> {
    const loaded = await loadChapter({ bookId, chapterId })
    return {
      chapterId: loaded.chapter.id,
      title: loaded.chapter.title,
      blocks: loaded.chapter.blocks.map(block => block.type === 'image' && block.src
        ? { ...block, src: imageAssetUrl(loaded.book, block.src) }
        : block),
      locator: `${loaded.book.id}:${loaded.chapter.id}`,
    }
  }

  function imageAssetUrl(book: Book, src: string): string {
    const endpoint = book.format === 'epub' ? 'epub-asset' : 'book-asset'
    return `/api/dsh-readpilot/${endpoint}?bookId=${encodeURIComponent(book.id)}&path=${encodeURIComponent(src)}&v=${Math.floor(book.mtimeMs)}`
  }

  async function saveReadingProgress({ bookId, chapterId, chapterTitle, chapterFraction, percent }: any = {}): Promise<{ bookId: string; chapterId: string }> {
    if (typeof bookId !== 'string' || typeof chapterId !== 'string') {
      throw new ReaderError('invalid-progress', '进度需要 bookId 与 chapterId')
    }
    const book = await resolveBook(bookId)
    const numericPercent = Number(percent)
    const numericFraction = Number(chapterFraction)
    await enqueueWrite(`progress:${dataDir}`, async () => {
      const progress = await loadProgress(dataDir)
      progress[book.id] = {
        chapterId,
        chapterTitle: typeof chapterTitle === 'string' ? chapterTitle : '',
        ...(Number.isFinite(numericFraction)
          ? { chapterFraction: Math.max(0, Math.min(1, numericFraction)) }
          : {}),
        ...(Number.isFinite(numericPercent)
          ? { percent: Math.max(0, Math.min(100, numericPercent)) }
          : {}),
        updatedAt: Date.now(),
      }
      await saveProgress(dataDir, progress)
    })
    return { bookId: book.id, chapterId }
  }

  async function setCompanionSession({ bookId, sessionId }: any = {}): Promise<{ bookId: string; sessionId: string | null }> {
    if (typeof bookId !== 'string' || !bookId) {
      throw new ReaderError('invalid-session', '缺少书籍 ID')
    }
    if (sessionId != null && typeof sessionId !== 'string') {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    await enqueueWrite(`sessions:${dataDir}`, async () => {
      const sessions = await loadSessions(dataDir)
      if (sessionId) {
        sessions[bookId] = { sessionId, updatedAt: Date.now() }
      } else {
        delete sessions[bookId]
      }
      await saveSessions(dataDir, sessions)
    })
    return { bookId, sessionId: sessionId ?? null }
  }

  function archivedSessionIds(): string[] {
    const registry = ctx.get('workspaceRegistry') as { archivedSessionIds?: unknown } | undefined
    const ids = registry?.archivedSessionIds
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  }

  async function sessionAlive({ sessionId }: { sessionId?: unknown } = {}): Promise<{ sessionId: string; alive: boolean }> {
    if (typeof sessionId !== 'string' || !sessionId) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    return { sessionId, alive: !archivedSessionIds().includes(sessionId) }
  }

  async function sessionBook({ sessionId }: { sessionId?: unknown } = {}): Promise<SessionBookResult | null> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) return null
    if (archivedSessionIds().includes(sessionId)) return null
    const [sessions, books, progress] = await Promise.all([
      loadSessions(dataDir),
      libraryBooks(),
      loadProgress(dataDir),
    ])
    let latest: { bookId: string; updatedAt: number } | null = null
    for (const [bookId, entry] of Object.entries(sessions)) {
      if (entry.sessionId !== sessionId) continue
      if (!latest || entry.updatedAt > latest.updatedAt) latest = { bookId, updatedAt: entry.updatedAt }
    }
    if (!latest) return null
    const book = books.find(candidate => candidate.id === latest.bookId)
    if (!book) return null
    return {
      bookId: book.id,
      title: book.title,
      format: book.format,
      progress: progress[book.id] ?? null,
    }
  }

  async function setCompanionPolicy({ sessionId }: { sessionId?: unknown } = {}): Promise<{ sessionId: string; mode: string | null; applied: boolean }> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const sessions = ctx.get('sessions')
    const session = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
    if (!session || typeof session.append !== 'function') {
      return { sessionId, mode: null, applied: false }
    }
    const policy = ctx.get('sandboxPolicy')
    const current = policy && typeof policy.overrideOf === 'function' ? policy.overrideOf(session) : undefined
    if (current === 'read-only' || readOnlySessions.has(sessionId)) {
      readOnlySessions.add(sessionId)
      return { sessionId, mode: 'read-only', applied: false }
    }
    session.append('sandbox/mode', { mode: 'read-only' })
    readOnlySessions.add(sessionId)
    return { sessionId, mode: 'read-only', applied: true }
  }

  async function setCompanionContext({ sessionId, bookId, title, chapter, view }: any = {}): Promise<{ sessionId: string; characters: number }> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const book = typeof bookId === 'string' ? bookId.slice(0, 128) : ''
    const bookTitle = typeof title === 'string' ? title.slice(0, 300) : ''
    const chapterTitle = typeof chapter === 'string' ? chapter.slice(0, 300) : ''
    const previous = companionReadings.get(sessionId)
    const normalizedView = normalizeReadingView(view)
    const effectiveView = normalizedView ?? previous?.view
    const rangeText = effectiveView?.pageStart
      ? `查看范围：第 ${effectiveView.pageStart}${effectiveView.pageEnd && effectiveView.pageEnd !== effectiveView.pageStart ? `–${effectiveView.pageEnd}` : ''} 页${effectiveView.pageTotal ? ` / 共 ${effectiveView.pageTotal} 页` : ''}`
      : effectiveView?.chapterIndex !== undefined
        ? `当前位置：第 ${effectiveView.chapterIndex + 1} 章${effectiveView.chapterTotal ? ` / 共 ${effectiveView.chapterTotal} 章` : ''}`
        : ''
    const selectionText = effectiveView?.selection
      ? `用户选中：${effectiveView.selection.slice(0, 600)}${effectiveView.selection.length > 600 ? '…' : ''}`
      : ''
    const recentActions = book ? recentActionSummary(book).slice(0, 5) : []
    const actionText = recentActions.length > 0
      ? [
        '<recent_agent_actions>',
        ...recentActions.map(action => `${action.summary}（${action.status === 'undone_by_user' ? '用户已撤销' : '已应用'}）`),
        '最近状态可能与工具当时返回不同：标注“用户已撤销”的动作是用户主动撤销，不是工具失败。',
        '</recent_agent_actions>',
      ].join('\n')
      : ''
    const text = [
      '<reading_context>',
      '以下是阅读器伴读会话的当前阅读位置，属于资料而不是用户消息：',
      bookTitle ? `书名：${bookTitle}` : '',
      chapterTitle ? `章节：${chapterTitle}` : '',
      rangeText,
      selectionText,
      book ? `书籍 ID：${book}` : '',
      actionText,
      '回答时以用户最近的问题为准，不要剧透未读章节。',
      '</reading_context>',
    ].filter(Boolean).join('\n')
    companionContexts.set(sessionId, { text, updatedAt: Date.now() })
    if (companionContexts.size > 200) {
      const oldest = [...companionContexts.entries()]
        .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
      for (const [id] of oldest.slice(0, companionContexts.size - 200)) companionContexts.delete(id)
    }
    if (book) {
      const bookChanged = previous?.bookId !== book
      companionReadings.set(sessionId, {
        bookId: book,
        title: bookTitle,
        chapter: chapterTitle,
        ...(effectiveView ? { view: effectiveView } : {}),
        updatedAt: Date.now(),
      })
      if (companionReadings.size > 200) {
        const oldest = [...companionReadings.entries()]
          .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
        for (const [id] of oldest.slice(0, companionReadings.size - 200)) companionReadings.delete(id)
      }
      if (bookChanged && companionSettings.notes[book]) void rebuildNotesContext(book)
      if (bookChanged && effectiveMemoryState(companionSettings, book) === 'on') void rebuildMemory(book)
    }
    return { sessionId, characters: text.length }
  }

  async function ensureSessionReading(sessionId: string): Promise<{ bookId: string; title: string; chapter: string; view?: CompanionReadingView } | undefined> {
    const existing = companionReadings.get(sessionId)
    if (existing) return existing
    const [sessions, books, progress] = await Promise.all([
      loadSessions(dataDir),
      libraryBooks(),
      loadProgress(dataDir),
    ])
    const entries = Object.entries(sessions)
      .filter(([, entry]) => entry.sessionId === sessionId)
      .sort((left, right) => (left[1].updatedAt ?? 0) - (right[1].updatedAt ?? 0))
    const latest = entries.at(-1)
    if (!latest) return undefined
    const [bookId, entry] = latest
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) return undefined
    await setCompanionContext({
      sessionId: entry.sessionId,
      bookId: book.id,
      title: book.title,
      chapter: progress[book.id]?.chapterTitle ?? '',
    })
    return companionReadings.get(sessionId)
  }

  async function syncCompanionContexts(): Promise<void> {
    const [sessions, books, progress, companion] = await Promise.all([
      loadSessions(dataDir),
      libraryBooks(),
      loadProgress(dataDir),
      loadCompanionSettings(dataDir),
    ])
    companionSettings = companion
    const bookById = new Map(books.map(book => [book.id, book]))
    const entries = Object.entries(sessions).sort((left, right) => (left[1].updatedAt ?? 0) - (right[1].updatedAt ?? 0))
    for (const [bookId, entry] of entries) {
      if (companionReadings.has(entry.sessionId)) continue
      const book = bookById.get(bookId)
      if (!book) continue
      await setCompanionContext({
        sessionId: entry.sessionId,
        bookId: book.id,
        title: book.title,
        chapter: progress[book.id]?.chapterTitle ?? '',
      })
    }
  }

  function companionContextOf(sessionId: unknown): string {
    return typeof sessionId === 'string' ? companionContexts.get(sessionId)?.text ?? '' : ''
  }

  async function search({ bookId, query, limit }: any = {}): Promise<SearchResult> {
    if (typeof query !== 'string' || query.trim().length < 2) {
      throw new ReaderError('invalid-query', '检索词至少需要 2 个字符')
    }
    const wanted = query.trim()
    const lowered = wanted.toLowerCase()
    const allResults = limit === 0 || limit === 'all'
    const maxResults = allResults ? MAX_SEARCH_RESULTS : Math.min(positiveInteger(limit, 20), 50)
    const scoped = typeof bookId === 'string' && bookId.length > 0
    const supported = (scoped ? [await resolveBook(bookId)] : await libraryBooks())
      .filter(book => book.supported)
    const books = scoped ? supported : supported.slice(0, MAX_SEARCH_BOOKS)
    const matches: SearchMatch[] = []
    let limited = false
    let unreadable = false
    let scanned = 0
    let parsedBytes = 0
    const startedAt = Date.now()

    for (const book of books) {
      if (!book.supported) continue
      if (!scoped && (
        parsedBytes + book.size > MAX_SEARCH_PARSE_BYTES
        || Date.now() - startedAt > MAX_SEARCH_PARSE_MS
      )) break
      parsedBytes += book.size
      scanned += 1
      let parsed: BookCacheRecord
      try {
        parsed = await ensureParsed(book)
      } catch {
        unreadable = true
        continue
      }
      for (const chapter of parsed.chapters) {
        const text = chapterText(chapter)
        const haystack = text.toLowerCase()
        let from = 0
        while (from < haystack.length) {
          const index = haystack.indexOf(lowered, from)
          if (index === -1) break
          const start = Math.max(0, index - 60)
          const end = Math.min(text.length, index + wanted.length + 120)
          matches.push({
            bookId: book.id,
            bookTitle: parsed.title || book.title,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            offset: index,
            snippet: text.slice(start, end).replace(/\s+/g, ' ').trim(),
            locator: `${book.id}:${chapter.id}:${index}`,
            jumpUrl: buildReaderJumpUrl(book.id, chapter.id, index),
          })
          if (matches.length >= maxResults) {
            limited = true
            break
          }
          from = index + Math.max(wanted.length, 1)
        }
        if (matches.length >= maxResults) break
      }
      if (matches.length >= maxResults) break
    }
    return {
      matches,
      truncated: limited || scanned < supported.length,
      query: wanted,
      booksScanned: scanned,
      booksTotal: supported.length,
      unreadable,
    }
  }

  async function toolBooks(): Promise<any> {
    const snapshot = await state()
    return {
      libraryDir: snapshot.settings.libraryDir,
      books: snapshot.books.map(book => ({
        id: book.id,
        title: book.title,
        format: book.format,
        supported: book.supported,
        size: book.size,
        progress: book.progress,
      })),
    }
  }

  async function toolOpen({ book }: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    const detail = await open({ bookId: found.id })
    return {
      bookId: found.id,
      title: detail.book.title,
      author: detail.book.author,
      format: found.format,
      toc: detail.toc.slice(0, 200).map(item => ({
        ...item,
        jumpUrl: buildReaderJumpUrl(found.id, item.id),
      })),
      tocTruncated: detail.toc.length > 200,
      ...(detail.scanOnly ? { scanOnly: true, pageCount: detail.pageCount } : {}),
      progress: detail.progress?.chapterId
        ? { ...detail.progress, jumpUrl: buildReaderJumpUrl(found.id, detail.progress.chapterId) }
        : detail.progress,
    }
  }

  async function toolDigest({ book, maxChars, perChapterChars }: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    const parsed = await ensureParsed(found)
    const digest = buildBookDigest(
      parsed.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        text: chapterText(chapter),
      })),
      { maxChars, perChapterChars },
    )
    return {
      bookId: found.id,
      title: parsed.title || found.title,
      format: found.format,
      ...digest,
      note: '这是抽取式全书摘要，不是逐字全文；需要细节时用 reader_read 读取指定章节。',
    }
  }

  async function toolContext({ book, sessionId }: any = {}): Promise<any> {
    const books = await libraryBooks()
    const activeReading = typeof sessionId === 'string' ? await ensureSessionReading(sessionId) : undefined
    let found: Book | undefined
    if (book) {
      found = findBookByKey(books, book)
      if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    } else {
      if (activeReading) found = books.find(candidate => candidate.id === activeReading.bookId)
      if (!found) {
        const progress = await loadProgress(dataDir)
        found = books
          .filter(candidate => progress[candidate.id])
          .sort((left, right) => (progress[right.id].updatedAt ?? 0) - (progress[left.id].updatedAt ?? 0))[0]
      }
      if (!found) throw new ReaderError('no-current-book', '还没有最近阅读的书籍，请先用 reader_books 选择一本书')
    }
    const detail = await open({ bookId: found.id })
    const notes = await notesStore.list(found.id)
    return {
      bookId: found.id,
      title: detail.book.title,
      author: detail.book.author,
      format: found.format,
      view: activeReading?.bookId === found.id ? activeReading.view ?? null : null,
      progress: detail.progress?.chapterId
        ? { ...detail.progress, jumpUrl: buildReaderJumpUrl(found.id, detail.progress.chapterId) }
        : detail.progress,
      toc: detail.toc.slice(0, 60).map(item => ({
        ...item,
        jumpUrl: buildReaderJumpUrl(found.id, item.id),
      })),
      tocTruncated: detail.toc.length > 60,
      ...(detail.scanOnly ? { scanOnly: true, pageCount: detail.pageCount } : {}),
      jumpUrl: detail.progress?.chapterId
        ? buildReaderJumpUrl(found.id, detail.progress.chapterId)
        : null,
      notes: notes.slice(0, 10).map(note => ({
        id: note.id,
        chapterId: note.chapterId,
        quote: note.quote,
        note: note.note,
      })),
      notesTruncated: notes.length > 10,
      recentActions: recentActionSummary(found.id),
    }
  }

  async function toolRead({ book, chapter: chapterKey, offset, limit }: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    const parsed = await ensureParsed(found)
    const index = Number.isInteger(chapterKey) ? chapterKey - 1 : -1
    const target = parsed.chapters.find(item => item.id === chapterKey)
      ?? parsed.chapters.find(item => item.title === chapterKey)
      ?? (index >= 0 ? parsed.chapters[index] : undefined)
      ?? parsed.chapters[0]
    if (!target) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    const text = chapterText(target)
    const start = Math.min(Math.max(Number.isInteger(offset) ? offset : 0, 0), text.length)
    const size = Math.min(Math.max(Number.isInteger(limit) ? limit : DEFAULT_READ_LIMIT, 200), MAX_READ_LIMIT)
    const slice = text.slice(start, start + size)
    const nextOffset = start + slice.length
    return {
      bookId: found.id,
      bookTitle: parsed.title || found.title,
      chapterId: target.id,
      chapterTitle: target.title,
      offset: start,
      limit: size,
      text: slice,
      nextOffset,
      hasMore: nextOffset < text.length,
      locator: `${found.id}:${target.id}:${start}`,
      jumpUrl: buildReaderJumpUrl(found.id, target.id),
    }
  }

  async function toolSearch({ book, query, limit }: any = {}): Promise<SearchResult> {
    const books = await libraryBooks()
    const found = book ? findBookByKey(books, book) : undefined
    if (book && !found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    return search({ bookId: found?.id, query, limit })
  }

  async function toolNote({ action, book, chapter, blockIndex, offset, quote, note, color, noteId }: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    if (action === 'list') {
      return {
        bookId: found.id,
        bookTitle: found.title,
        notes: await notesStore.list(found.id),
        recentActions: recentActionSummary(found.id),
      }
    }
    if (action === 'update' || action === 'delete') {
      const id = typeof noteId === 'string' ? noteId : ''
      if (!id) throw new ReaderError('invalid-note', 'noteId 不能为空')
      const previous = (await notesStore.list(found.id)).find(note => note.id === id)
      if (action === 'delete') {
        const deleted = await notesStore.remove(found.id, id)
        if (deleted && previous) {
          await recordReaderReceipt({
            type: 'annotation.delete',
            bookId: found.id,
            bookTitle: found.title,
            summary: `删除批注：${previous.quote.slice(0, 40) || previous.note.slice(0, 40)}`,
            undo: { kind: 'restoreNote', bookId: found.id, note: previous },
          })
        }
        if (companionSettings.notes[found.id]) await rebuildNotesContext(found.id)
        return { bookId: found.id, bookTitle: found.title, noteId: id, deleted }
      }
      const patch: Record<string, string> = {}
      if (typeof note === 'string') patch.note = note
      if (typeof quote === 'string') patch.quote = quote
      if (typeof color === 'string') patch.color = color
      if (Object.keys(patch).length === 0) throw new ReaderError('invalid-note', '更新批注需要 note、quote 或 color')
      const record = await notesStore.update(found.id, id, patch)
      if (previous) {
        await recordReaderReceipt({
          type: 'annotation.update',
          bookId: found.id,
          bookTitle: found.title,
          summary: `修改批注：${previous.quote.slice(0, 40) || id}`,
          undo: { kind: 'restoreNote', bookId: found.id, note: previous },
        })
      }
      if (companionSettings.notes[found.id]) await rebuildNotesContext(found.id)
      return { bookId: found.id, bookTitle: found.title, noteId: id, note: record }
    }
    if (action !== 'add') {
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(action)}`)
    }
    if (typeof quote !== 'string' || !quote.trim()) {
      throw new ReaderError('invalid-note', '批注需要引用原文')
    }
    const parsed = await ensureParsed(found)
    const target = parsed.chapters.find(item => item.id === chapter)
      ?? parsed.chapters.find(item => item.title === chapter)
      ?? parsed.chapters[0]
    if (!target) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    const record = await notesStore.add(found.id, {
      kind: 'annotation',
      color,
      chapterId: target.id,
      blockIndex: Number.isInteger(blockIndex) && blockIndex >= 0 ? blockIndex : 0,
      offset: Number.isInteger(offset) && offset >= 0 ? offset : 0,
      quote: typeof quote === 'string' ? quote : '',
      note: typeof note === 'string' ? note : '',
    })
    if (companionSettings.notes[found.id]) await rebuildNotesContext(found.id)
    await recordReaderReceipt({
      type: 'annotation.add',
      bookId: found.id,
      bookTitle: found.title,
      summary: `新增批注：${record.quote.slice(0, 40) || '划线'}`,
      undo: { kind: 'deleteNote', bookId: found.id, noteId: record.id },
    })
    return {
      bookId: found.id,
      bookTitle: parsed.title || found.title,
      chapterId: target.id,
      chapterTitle: target.title,
      note: record,
    }
  }

  const { handleNotes } = createNotesHandlers({
    resolveBook,
    notes: notesStore,
    refresh: async bookId => (companionSettings.notes[bookId] ? rebuildNotesContext(bookId) : 0),
  })

  const noteFileHandlers = createNoteFileHandlers({
    settings: currentSettings,
    books: () => libraryBooks(),
    resolveBook,
    refreshNotes: async (bookId: string) => {
      if (companionSettings.notes[bookId]) await rebuildNotesContext(bookId)
    },
  })
  const { store: ensureNoteFileStore, handleNoteFiles, toolNoteFiles } = noteFileHandlers
  const promptPresetStore: PromptPresetStore = createPromptPresetStore(dataDir)
  const { prompts } = createPromptHandlers({ store: promptPresetStore })
  const readerActionStore = createReaderActionStore()

  async function pushReaderAction(action: ReaderActionInput): Promise<ReaderAction> {
    return readerActionStore.push(action)
  }

  async function recordReaderReceipt(input: ReaderReceiptInput): Promise<ReaderActionReceipt> {
    return readerActionStore.addReceipt(input)
  }

  function recentActionSummary(bookId: string) {
    return readerActionStore.listReceipts({ bookId, limit: 10 }).map(receipt => ({
      id: receipt.id,
      type: receipt.type,
      summary: receipt.summary,
      createdAt: receipt.createdAt,
      undoable: receipt.undoable,
      status: receipt.undoneAt ? 'undone_by_user' : 'applied',
      ...(receipt.undoneAt ? { undoneAt: receipt.undoneAt } : {}),
    }))
  }

  async function refreshCompanionContexts(bookId: string) {
    for (const [sessionId, reading] of companionReadings) {
      if (reading.bookId !== bookId) continue
      try {
        await setCompanionContext({
          sessionId,
          bookId: reading.bookId,
          title: reading.title,
          chapter: reading.chapter,
          ...(reading.view ? { view: reading.view } : {}),
        })
      } catch {
        // A stale session must not block the undo.
      }
    }
  }

  async function readerReceipts(payload: any = {}): Promise<any> {
    if (payload.action === 'list') {
      const bookId = typeof payload.bookId === 'string' ? payload.bookId : undefined
      return {
        receipts: readerActionStore.listReceipts({
          bookId,
          limit: Number.isInteger(payload.limit) ? payload.limit : undefined,
        }),
      }
    }
    if (payload.action !== 'undo') {
      throw new ReaderError('invalid-reader-action', `未知动作回执操作：${String(payload.action)}`)
    }
    const receiptId = typeof payload.receiptId === 'string' ? payload.receiptId : ''
    const receipt = readerActionStore.getReceipt(receiptId)
    if (!receipt) throw new ReaderError('receipt-not-found', '动作回执不存在或已过期')
    if (receipt.undoneAt) throw new ReaderError('already-undone', '这个动作已经撤销')
    if (!receipt.undo) throw new ReaderError('not-undoable', '这个动作不可撤销')
    const undo = receipt.undo
    try {
      if (undo.kind === 'deleteNote') {
        await notesStore.remove(undo.bookId, undo.noteId)
        if (companionSettings.notes[undo.bookId]) await rebuildNotesContext(undo.bookId)
        readerActionStore.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'restoreNote') {
        await notesStore.restore(undo.note)
        if (companionSettings.notes[undo.bookId]) await rebuildNotesContext(undo.bookId)
        readerActionStore.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'restoreNoteFile') {
        const book = await resolveBook(undo.bookId)
        const store = await ensureNoteFileStore()
        await store.restore(book, undo.note, undo.body)
        readerActionStore.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'deleteNoteFile') {
        const book = await resolveBook(undo.bookId)
        const store = await ensureNoteFileStore()
        await store.remove(book, undo.noteId)
        readerActionStore.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'setTags') {
        await libraryMetaStore.setTags(undo.bookId, undo.tags)
        readerActionStore.push({ type: 'libraryRefresh' })
      } else if (undo.kind === 'setStatus') {
        await libraryMetaStore.setStatus(undo.bookId, undo.status)
        readerActionStore.push({ type: 'libraryRefresh' })
      }
      const updated = readerActionStore.markUndone(receiptId)
      await refreshCompanionContexts(undo.bookId)
      return { receipt: updated, undone: true }
    } catch (error) {
      if (error instanceof ReaderError) throw error
      throw new ReaderError('undo-failed', error instanceof Error ? error.message : String(error))
    }
  }

  async function readerActions(payload: any = {}): Promise<{ actions: ReaderAction[] }> {
    if (payload.action !== 'take') {
      throw new ReaderError('invalid-reader-action', `未知阅读动作操作：${String(payload.action)}`)
    }
    const types = Array.isArray(payload.types)
      ? payload.types.filter((value: unknown): value is ReaderActionType =>
        value === 'goto' || value === 'open_panel' || value === 'notesRefresh' || value === 'libraryRefresh')
      : undefined
    const bookId = typeof payload.bookId === 'string' ? payload.bookId : undefined
    return { actions: readerActionStore.take({ types, bookId }) }
  }

  async function rebuildNotesContext(bookId: string): Promise<number> {
    try {
      const book = await resolveBook(bookId)
      const store = await ensureNoteFileStore()
      const files = await store.list(book)
      const notes: ReadingNote[] = []
      for (const note of files) {
        try {
          const value = await store.read(book, note.id)
          notes.push({ kind: note.kind, title: note.title, body: value.body, path: note.path })
        } catch {
          // A single unreadable note must not remove the rest of the context.
        }
      }
      const highlights: ReadingHighlight[] = (await notesStore.list(book.id))
        .filter(note => note.kind === 'annotation' && note.note.trim())
        .map(note => ({ quote: note.quote, annotation: note.note }))
      const text = buildReadingNotes({ bookTitle: book.title, notes, highlights })
      notesContextCache.set(book.id, { text, characters: text.length, updatedAt: Date.now() })
      if (notesContextCache.size > 50) {
        const oldest = [...notesContextCache.entries()]
          .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
        for (const [id] of oldest.slice(0, notesContextCache.size - 50)) notesContextCache.delete(id)
      }
      return text.length
    } catch {
      notesContextCache.set(bookId, { text: '', characters: 0, updatedAt: Date.now() })
      return 0
    }
  }

  async function setNoteContext({ bookId, enabled }: any = {}): Promise<{ bookId: string; enabled: boolean; characters: number }> {
    const book = await resolveBook(bookId)
    if (typeof enabled !== 'boolean') throw new ReaderError('invalid-context', 'enabled 必须是布尔值')
    companionSettings = await loadCompanionSettings(dataDir)
    if (enabled) {
      companionSettings = { ...companionSettings, notes: { ...companionSettings.notes, [book.id]: true } }
    } else {
      const notes = { ...companionSettings.notes }
      delete notes[book.id]
      companionSettings = { ...companionSettings, notes }
      notesContextCache.delete(book.id)
    }
    await saveCompanionSettings(dataDir, companionSettings)
    const characters = enabled ? await rebuildNotesContext(book.id) : 0
    return { bookId: book.id, enabled, characters }
  }

  async function setAutoApplyNotes({ enabled }: any = {}): Promise<{ enabled: boolean }> {
    if (typeof enabled !== 'boolean') throw new ReaderError('invalid-context', 'enabled 必须是布尔值')
    companionSettings = await loadCompanionSettings(dataDir)
    companionSettings = { ...companionSettings, autoApplyNotes: enabled }
    await saveCompanionSettings(dataDir, companionSettings)
    return { enabled }
  }

  function notesContextFor(sessionId: unknown): string {
    if (typeof sessionId !== 'string' || !sessionId) return ''
    const reading = companionReadings.get(sessionId)
    if (!reading || !companionSettings.notes[reading.bookId]) return ''
    return notesContextCache.get(reading.bookId)?.text ?? ''
  }

  const { rebuildMemory, memory, memoryTool, memoryContextFor } = createMemoryHandlers({
    resolveBook,
    books: () => libraryBooks(),
    findBook: findBookByKey,
    store: memoryStore,
    getSettings: () => companionSettings,
    setSettings: value => { companionSettings = value },
    loadSettings: () => loadCompanionSettings(dataDir),
    saveSettings: value => saveCompanionSettings(dataDir, value),
    readings: companionReadings,
    cache: memoryCache,
  })

  const { noteDrafts, noteDraftCreate } = createDraftHandlers({
    books: () => libraryBooks(),
    findBook: findBookByKey,
    resolveBook,
    loadSettings: () => loadCompanionSettings(dataDir),
    store: ensureNoteDraftStore,
    refreshNotes: async bookId => (companionSettings.notes[bookId] ? rebuildNotesContext(bookId) : 0),
  })

  async function ensureNoteDraftStore(): Promise<NoteDraftStore> {
    return createNoteDraftStore(dataDir, await ensureNoteFileStore())
  }

  async function openNoteFile({ bookId, id }: any = {}): Promise<{ opened: boolean; path: string }> {
    const book = await resolveBook(bookId)
    const store = await ensureNoteFileStore()
    const content = await store.read(book, String(id ?? ''))
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const target = noteFilePath(settings.libraryDir, content.note.path)
    try {
      await stat(target)
    } catch {
      throw new ReaderError('open-failed', '笔记文件不存在或无法读取')
    }
    try {
      await openWithExternalEditor(target)
    } catch (error) {
      throw new ReaderError(
        'open-failed',
        `无法打开外部编辑器：${error instanceof Error ? error.message : String(error)}`,
      )
    }
    return { opened: true, path: content.note.path }
  }

  async function exportNotes({ bookId, save }: any = {}): Promise<{ markdown: string; fileName: string; path?: string }> {
    const book = await resolveBook(bookId)
    const opened = await open({ bookId: book.id })
    const store = await ensureNoteFileStore()
    const files = await store.list(book)
    const notes: ExportLongNote[] = []
    for (const file of files) {
      try {
        const content = await store.read(book, file.id)
        notes.push({
          kind: file.kind,
          title: file.title,
          body: content.body,
          path: file.path,
          updatedAt: file.updatedAt,
        })
      } catch {
        // Export the remaining notes even if one file is unreadable.
      }
    }
    const chapterTitles = new Map(opened.toc.map(item => [item.id, item.title]))
    const marks: ExportMark[] = (await notesStore.list(book.id)).map(record => ({
      kind: record.kind,
      chapterTitle: chapterTitles.get(record.chapterId) ?? record.chapterId,
      quote: record.quote,
      note: record.note,
      annotation: record.annotation,
      color: record.color,
      pageLabel: record.kind === 'bookmark' ? record.annotation : undefined,
    }))
    const meta = await libraryMetaStore.list()
    const markdown = buildNotesMarkdown({
      book: {
        title: book.title,
        ...(opened.book.author ? { author: opened.book.author } : {}),
        ...(meta.tags[book.id]?.length ? { tags: meta.tags[book.id] } : {}),
        ...(opened.progress
          ? { progress: { chapterTitle: opened.progress.chapterTitle, percent: opened.progress.percent } }
          : {}),
      },
      notes,
      marks,
    })
    const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '-').trim() || '阅读笔记'
    const fileName = `${safeTitle}-阅读笔记.md`
    if (save !== true) return { markdown, fileName }
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const dir = join(settings.libraryDir, NOTES_DIR_NAME, '.exports')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, fileName), markdown, 'utf8')
    return { markdown, fileName, path: `notes/.exports/${fileName}` }
  }

  async function pageView({ bookId, page, scale }: any = {}): Promise<PageViewResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'pdf') throw new ReaderError('not-pdf', '只有 PDF 支持页面渲染')
    const renderer = await getPdfRenderer()
    const result = await renderer.render({
      bookId: book.id,
      filePath: book.path,
      page,
      scale,
    })
    return {
      width: result.width,
      height: result.height,
      pageCount: result.pageCount,
      textItems: result.textItems,
    }
  }

  async function pdfPage(payload: any = {}): Promise<{ png: Buffer; contentType: string }> {
    const book = await resolveBook(payload.bookId)
    if (book.format !== 'pdf') throw new ReaderError('not-pdf', '只有 PDF 支持页面渲染')
    const renderer = await getPdfRenderer()
    const result = await renderer.render({
      bookId: book.id,
      filePath: book.path,
      page: payload.page,
      scale: payload.scale,
    })
    return { png: result.png, contentType: 'image/png' }
  }

  async function cover({ bookId }: any = {}): Promise<{ bytes: Buffer; contentType: string }> {
    const book = await resolveBook(bookId)
    return coverLimit(async () => {
      if (book.format === 'epub') {
        const visual = await getEpubVisual()
        const result = await visual.cover({ bookId: book.id, filePath: book.path })
        if (!result) throw new ReaderError('no-cover', '这本书没有封面')
        return result
      }
      if (book.format === 'pdf') {
        const page = await pdfPage({ bookId: book.id, page: 1, scale: PDF_COVER_SCALE })
        return { bytes: page.png, contentType: page.contentType }
      }
      throw new ReaderError('no-cover', '这本书没有封面')
    })
  }

  async function epubDocument({ bookId, href }: any = {}): Promise<EpubDocumentResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'epub') throw new ReaderError('not-epub', '只有 EPUB 支持原书渲染')
    if (typeof href !== 'string' || !href) throw new ReaderError('invalid-href', '缺少 EPUB 章节 href')
    const visual = await getEpubVisual()
    return visual.readDocument({
      bookId: book.id,
      filePath: book.path,
      href,
      assetBase: '/api/dsh-readpilot/epub-asset',
      docBase: '/api/dsh-readpilot/epub-doc',
    })
  }

  async function epubAsset({ bookId, path }: any = {}): Promise<EpubAssetResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'epub') throw new ReaderError('not-epub', '只有 EPUB 支持原书资源')
    if (typeof path !== 'string' || !path) throw new ReaderError('invalid-path', '缺少 EPUB 资源路径')
    const visual = await getEpubVisual()
    return visual.readAsset({ bookId: book.id, filePath: book.path, path })
  }

  async function bookAsset({ bookId, path }: any = {}): Promise<{ bytes: Buffer; contentType: string }> {
    const book = await resolveBook(bookId)
    if (book.format === 'epub') return epubAsset({ bookId: book.id, path })
    if (typeof path !== 'string' || !path) throw new ReaderError('invalid-path', '缺少图片路径')
    if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(path)) throw new ReaderError('invalid-path', '图片路径必须是书库内的相对路径')
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const root = resolve(settings.libraryDir)
    const target = resolve(dirname(book.path), path)
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      throw new ReaderError('invalid-path', '图片路径越界')
    }
    const info = await stat(target)
    if (!info.isFile()) throw new ReaderError('invalid-path', '图片不是文件')
    if (info.size > MAX_BOOK_IMAGE_BYTES) throw new ReaderError('image-too-large', '图片超过大小限制')
    const contentType = BOOK_IMAGE_TYPES.get(extname(target).toLowerCase())
    if (!contentType) throw new ReaderError('unsupported-image', '不支持的图片格式')
    return { bytes: await readFile(target), contentType }
  }

  async function handleRpc(endpoint: string, payload?: unknown): Promise<RpcResult> {
    const handlers: Record<BaseEndpoint, (payload?: any) => Promise<any>> = {
      state,
      rescan,
      configure: configureLibrary,
      deleteDuplicate,
      backupExport,
      backupRestore,
      open,
      chapter,
      progress: saveReadingProgress,
      session: setCompanionSession,
      sessionBook,
      sessionAlive,
      companionPolicy: setCompanionPolicy,
      companionContext: setCompanionContext,
      setNoteContext,
      setAutoApplyNotes,
      memory,
      search,
      notes: handleNotes,
      prompts,
      readerActions,
      readerReceipts,
      noteFiles: handleNoteFiles,
      noteDrafts,
      openNoteFile,
      exportNotes,
      pageView,
      libraryMeta,
      setBookTags,
      setBookStatus,
      setBookRating,
    }
    const handler = (handlers as Record<string, (payload?: any) => Promise<any>>)[endpoint]
    if (!handler) {
      return { ok: false, error: { code: 'unknown-endpoint', message: `未知接口：${String(endpoint)}`, details: {} } }
    }
    try {
      return { ok: true, value: await handler(payload ?? {}) }
    } catch (error) {
      const code = error instanceof ReaderError ? error.code : 'reader-error'
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: { code, message, details: {} } }
    }
  }

  return {
    state,
    rescan,
    syncPrompt,
    configureLibrary,
    deleteDuplicate,
    backupExport,
    backupRestore,
    open,
    chapter,
    saveReadingProgress,
    setCompanionSession,
    sessionAlive,
    sessionBook,
    setCompanionPolicy,
    setCompanionContext,
    syncCompanionContexts,
    companionContextOf,
    setNoteContext,
    setAutoApplyNotes,
    notesContextFor,
    memory,
    memoryTool,
    memoryContextFor,
    prompts,
    readerActions,
    readerReceipts,
    pushReaderAction,
    recordReaderReceipt,
    noteDrafts,
    noteDraftCreate,
    toolNoteFiles,
    openNoteFile,
    exportNotes,
    search,
    libraryMeta,
    setBookTags,
    setBookStatus,
    setBookRating,
    toolBooks,
    toolOpen,
    toolDigest,
    toolContext,
    toolRead,
    toolSearch,
    toolNote,
    pageView,
    pdfPage,
    cover,
    epubDocument,
    epubAsset,
    bookAsset,
    handleRpc,
    dispose,
  }
}
