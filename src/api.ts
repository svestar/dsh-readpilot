import { spawn } from 'node:child_process'
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve, sep } from 'node:path'
import type { Chapter, TextBlock } from './formats.ts'
import { chapterText, isSupportedFormat, parseBookAsync } from './formats.ts'
import type { Book } from './library.ts'
import { findBookByKey, scanLibrary } from './library.ts'
import type { LibraryMeta, RatingMap, ReadStatus, StatusMap, TagMap } from './library-meta.ts'
import { createLibraryMetaStore } from './library-meta.ts'
import type { NotesStore } from './notes.ts'
import { createNotesStore } from './notes.ts'
import type { NoteFileStore } from './note-files.ts'
import { NOTES_DIR_NAME, NoteFileError, createNoteFileStore } from './note-files.ts'
import { buildReaderJumpUrl } from './jump-url.ts'
import type { CompanionSettings } from './companion-settings.ts'
import { effectiveMemoryState, loadCompanionSettings, saveCompanionSettings } from './companion-settings.ts'
import type { MemoryStore } from './memory-store.ts'
import { MemoryStoreError, createMemoryStore } from './memory-store.ts'
import { buildReadingMemory } from './memory-context.ts'
import type { MemoryProposalStore } from './memory-proposals.ts'
import { MemoryProposalError, createMemoryProposalStore } from './memory-proposals.ts'
import type { NoteDraftRecord, NoteDraftStore } from './note-drafts.ts'
import { NoteDraftError, createNoteDraftStore } from './note-drafts.ts'
import type { ExportLongNote, ExportMark } from './note-export.ts'
import { buildNotesMarkdown } from './note-export.ts'
import { buildReadingNotes } from './notes-context.ts'
import type { ReadingHighlight, ReadingNote } from './notes-context.ts'
import type { BookCacheRecord, ProgressMap, ReadingProgress, SessionMap, Settings } from './store.ts'
import {
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

const PARSER_VERSION = 6
const DEFAULT_MAX_BOOK_BYTES = 100 * 1024 * 1024
const DEFAULT_READ_LIMIT = 4000
const MAX_READ_LIMIT = 8000
const PDF_COVER_SCALE = 0.5
const MAX_SEARCH_BOOKS = 20

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
  syncPrompt(): Promise<void>
  configureLibrary(payload?: { path?: unknown }): Promise<ReaderState>
  open(payload?: { bookId?: unknown }): Promise<OpenResult>
  chapter(payload?: { bookId?: unknown; chapterId?: unknown }): Promise<ChapterContent>
  saveReadingProgress(payload?: any): Promise<{ bookId: string; chapterId: string }>
  setCompanionSession(payload?: any): Promise<{ bookId: string; sessionId: string | null }>
  setCompanionPolicy(payload?: { sessionId?: unknown }): Promise<{ sessionId: string; mode: string | null; applied: boolean }>
  setCompanionContext(payload?: any): Promise<{ sessionId: string; characters: number }>
  companionContextOf(sessionId: unknown): string
  setNoteContext(payload?: any): Promise<{ bookId: string; enabled: boolean; characters: number }>
  setAutoApplyNotes(payload?: { enabled?: unknown }): Promise<{ enabled: boolean }>
  notesContextFor(sessionId: unknown): string
  memory(payload?: any): Promise<any>
  memoryTool(payload?: any): Promise<any>
  memoryContextFor(sessionId: unknown): string
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
  toolContext(payload?: any): Promise<any>
  toolRead(payload?: any): Promise<any>
  toolSearch(payload?: any): Promise<any>
  toolNote(payload?: any): Promise<any>
  pageView(payload?: any): Promise<PageViewResult>
  pdfPage(payload?: any): Promise<{ png: Buffer; contentType: string }>
  cover(payload?: any): Promise<{ bytes: Buffer; contentType: string }>
  epubDocument(payload?: any): Promise<EpubDocumentResult>
  epubAsset(payload?: any): Promise<EpubAssetResult>
  handleRpc(endpoint: string, payload?: unknown): Promise<RpcResult>
}

export class ReaderError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ReaderError'
    this.code = code
  }
}

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
  const companionReadings = new Map<string, { bookId: string; title: string; chapter: string; updatedAt: number }>()
  const notesContextCache = new Map<string, { text: string; characters: number; updatedAt: number }>()
  let companionSettings: CompanionSettings = { notes: {}, memory: { mode: 'ask', books: {} }, autoApplyNotes: false }
  const memoryStore: MemoryStore = createMemoryStore(dataDir)
  const memoryProposalStore: MemoryProposalStore = createMemoryProposalStore(dataDir)
  const memoryCache = new Map<string, { text: string; characters: number; updatedAt: number }>()
  let noteFileStore: NoteFileStore | null = null
  let noteFileRoot: string | null = null
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

  async function libraryBooks(): Promise<Book[]> {
    const settings = await currentSettings()
    if (!settings.libraryDir) return []
    return scanLibrary(settings.libraryDir)
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
    const [books, progress, sessions, meta, companion] = await Promise.all([
      libraryBooks(),
      loadProgress(dataDir),
      loadSessions(dataDir),
      libraryMetaStore.list(),
      loadCompanionSettings(dataDir),
    ])
    companionSettings = companion
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
      throw new ReaderError(
        'no-extractable-text',
        book.format === 'pdf'
          ? '这个 PDF 没有可提取的文本层；扫描版需要 OCR，当前不支持'
          : '这本书没有可提取的文本',
      )
    }
    const visibleChapters = parsed.chapters.filter(chapter => !chapter.skip)
    const tocSource = visibleChapters.length > 0 ? visibleChapters : parsed.chapters
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
        const chapter = parsed.chapters.find(entry => entry.page === item.page)
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
      blocks: loaded.chapter.blocks,
      locator: `${loaded.book.id}:${loaded.chapter.id}`,
    }
  }

  async function saveReadingProgress({ bookId, chapterId, chapterTitle, percent }: any = {}): Promise<{ bookId: string; chapterId: string }> {
    if (typeof bookId !== 'string' || typeof chapterId !== 'string') {
      throw new ReaderError('invalid-progress', '进度需要 bookId 与 chapterId')
    }
    const book = await resolveBook(bookId)
    const progress = await loadProgress(dataDir)
    const numericPercent = Number(percent)
    progress[book.id] = {
      chapterId,
      chapterTitle: typeof chapterTitle === 'string' ? chapterTitle : '',
      ...(Number.isFinite(numericPercent)
        ? { percent: Math.max(0, Math.min(100, numericPercent)) }
        : {}),
      updatedAt: Date.now(),
    }
    await saveProgress(dataDir, progress)
    return { bookId: book.id, chapterId }
  }

  async function setCompanionSession({ bookId, sessionId }: any = {}): Promise<{ bookId: string; sessionId: string | null }> {
    if (typeof bookId !== 'string' || !bookId) {
      throw new ReaderError('invalid-session', '缺少书籍 ID')
    }
    if (sessionId != null && typeof sessionId !== 'string') {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const sessions = await loadSessions(dataDir)
    if (sessionId) {
      sessions[bookId] = { sessionId, updatedAt: Date.now() }
    } else {
      delete sessions[bookId]
    }
    await saveSessions(dataDir, sessions)
    return { bookId, sessionId: sessionId ?? null }
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

  async function setCompanionContext({ sessionId, bookId, title, chapter }: any = {}): Promise<{ sessionId: string; characters: number }> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const book = typeof bookId === 'string' ? bookId.slice(0, 128) : ''
    const bookTitle = typeof title === 'string' ? title.slice(0, 300) : ''
    const chapterTitle = typeof chapter === 'string' ? chapter.slice(0, 300) : ''
    const text = [
      '<reading_context>',
      '以下是阅读器伴读会话的当前阅读位置，属于资料而不是用户消息：',
      bookTitle ? `书名：${bookTitle}` : '',
      chapterTitle ? `章节：${chapterTitle}` : '',
      book ? `书籍 ID：${book}` : '',
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
      companionReadings.set(sessionId, {
        bookId: book,
        title: bookTitle,
        chapter: chapterTitle,
        updatedAt: Date.now(),
      })
      if (companionReadings.size > 200) {
        const oldest = [...companionReadings.entries()]
          .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
        for (const [id] of oldest.slice(0, companionReadings.size - 200)) companionReadings.delete(id)
      }
      if (companionSettings.notes[book]) void rebuildNotesContext(book)
      if (effectiveMemoryState(companionSettings, book) === 'on') void rebuildMemory(book)
    }
    return { sessionId, characters: text.length }
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
    const maxResults = Math.min(positiveInteger(limit, 20), 50)
    const books = bookId
      ? [await resolveBook(bookId)]
      : (await libraryBooks()).filter(book => book.supported).slice(0, MAX_SEARCH_BOOKS)
    const matches: SearchMatch[] = []
    let truncated = false

    for (const book of books) {
      if (!book.supported) continue
      let parsed: BookCacheRecord
      try {
        parsed = await ensureParsed(book)
      } catch {
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
            truncated = true
            break
          }
          from = index + Math.max(wanted.length, 1)
        }
        if (matches.length >= maxResults) break
      }
      if (matches.length >= maxResults) break
    }
    return { matches, truncated, query: wanted }
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
      progress: detail.progress?.chapterId
        ? { ...detail.progress, jumpUrl: buildReaderJumpUrl(found.id, detail.progress.chapterId) }
        : detail.progress,
    }
  }

  async function toolContext({ book }: any = {}): Promise<any> {
    const books = await libraryBooks()
    let found: Book | undefined
    if (book) {
      found = findBookByKey(books, book)
      if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    } else {
      const progress = await loadProgress(dataDir)
      found = books
        .filter(candidate => progress[candidate.id])
        .sort((left, right) => (progress[right.id].updatedAt ?? 0) - (progress[left.id].updatedAt ?? 0))[0]
      if (!found) throw new ReaderError('no-current-book', '还没有最近阅读的书籍，请先用 reader_books 选择一本书')
    }
    const detail = await open({ bookId: found.id })
    const notes = await notesStore.list(found.id)
    return {
      bookId: found.id,
      title: detail.book.title,
      author: detail.book.author,
      format: found.format,
      progress: detail.progress?.chapterId
        ? { ...detail.progress, jumpUrl: buildReaderJumpUrl(found.id, detail.progress.chapterId) }
        : detail.progress,
      toc: detail.toc.slice(0, 60).map(item => ({
        ...item,
        jumpUrl: buildReaderJumpUrl(found.id, item.id),
      })),
      tocTruncated: detail.toc.length > 60,
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

  async function toolNote({ action, book, chapter, blockIndex, offset, quote, note }: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    if (action === 'list') {
      return { bookId: found.id, bookTitle: found.title, notes: await notesStore.list(found.id) }
    }
    if (action !== 'add') {
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(action)}`)
    }
    if (typeof quote !== 'string' || !quote.trim()) {
      throw new ReaderError('invalid-note', '笔记需要引用原文')
    }
    if (typeof note !== 'string' || !note.trim()) {
      throw new ReaderError('invalid-note', '笔记内容不能为空')
    }
    const parsed = await ensureParsed(found)
    const target = parsed.chapters.find(item => item.id === chapter)
      ?? parsed.chapters.find(item => item.title === chapter)
      ?? parsed.chapters[0]
    if (!target) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    const record = await notesStore.add(found.id, {
      chapterId: target.id,
      blockIndex: Number.isInteger(blockIndex) && blockIndex >= 0 ? blockIndex : 0,
      offset: Number.isInteger(offset) && offset >= 0 ? offset : 0,
      quote: typeof quote === 'string' ? quote : '',
      note: typeof note === 'string' ? note : '',
    })
    return {
      bookId: found.id,
      bookTitle: parsed.title || found.title,
      chapterId: target.id,
      chapterTitle: target.title,
      note: record,
    }
  }

  async function handleNotes(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const refresh = async () => {
      if (companionSettings.notes[book.id]) await rebuildNotesContext(book.id)
    }
    if (payload.action === 'list') {
      return { notes: await notesStore.list(book.id) }
    }
    if (payload.action === 'add') {
      const record = await notesStore.add(book.id, {
        kind: payload.kind,
        color: payload.color,
        chapterId: payload.chapterId,
        blockIndex: payload.blockIndex,
        offset: payload.offset,
        quote: payload.quote,
        note: payload.note,
        annotation: payload.annotation,
        quotePrefix: payload.quotePrefix,
        quoteSuffix: payload.quoteSuffix,
        textHash: payload.textHash,
      })
      await refresh()
      return { note: record }
    }
    if (payload.action === 'update') {
      const patch: Record<string, string> = {}
      if (typeof payload.note === 'string') patch.note = payload.note
      if (typeof payload.quote === 'string') patch.quote = payload.quote
      if (typeof payload.annotation === 'string') patch.annotation = payload.annotation
      if (typeof payload.color === 'string') patch.color = payload.color
      const record = await notesStore.update(book.id, payload.noteId, patch)
      await refresh()
      return { note: record }
    }
    if (payload.action === 'delete') {
      const deleted = await notesStore.remove(book.id, payload.noteId)
      await refresh()
      return { deleted }
    }
    throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
  }

  async function ensureNoteFileStore(): Promise<NoteFileStore> {
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const root = join(settings.libraryDir, NOTES_DIR_NAME)
    if (!noteFileStore || noteFileRoot !== root) {
      noteFileStore = createNoteFileStore(root)
      noteFileRoot = root
    }
    return noteFileStore
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
        .filter(note => note.kind === 'highlight' && note.annotation.trim())
        .map(note => ({ quote: note.quote, annotation: note.annotation }))
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

  async function rebuildMemory(bookId: string): Promise<number> {
    try {
      if (effectiveMemoryState(companionSettings, bookId) !== 'on') {
        memoryCache.delete(bookId)
        return 0
      }
      const book = await resolveBook(bookId)
      const [reader, card] = await Promise.all([memoryStore.readReader(), memoryStore.readBook(bookId)])
      const text = buildReadingMemory({ bookTitle: book.title, reader: reader.text, book: card.text })
      memoryCache.set(bookId, { text, characters: text.length, updatedAt: Date.now() })
      return text.length
    } catch {
      memoryCache.delete(bookId)
      return 0
    }
  }

  async function rebuildAllMemory(): Promise<void> {
    const bookIds = new Set<string>()
    for (const reading of companionReadings.values()) bookIds.add(reading.bookId)
    await Promise.all([...bookIds].map(bookId => rebuildMemory(bookId)))
  }

  async function memoryStatus(book: Book): Promise<any> {
    const [bookCard, readerCard, bookHistory, readerHistory, proposals] = await Promise.all([
      memoryStore.readBook(book.id),
      memoryStore.readReader(),
      memoryStore.listHistory(book.id),
      memoryStore.listHistory(null),
      memoryProposalStore.list(book.id),
    ])
    return {
      mode: companionSettings.memory.mode,
      book: companionSettings.memory.books[book.id] ?? 'inherit',
      effective: effectiveMemoryState(companionSettings, book.id),
      bookText: bookCard.text,
      readerText: readerCard.text,
      bookHistory,
      readerHistory,
      proposals,
    }
  }

  async function memory(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    companionSettings = await loadCompanionSettings(dataDir)
    try {
      if (payload.action === 'setMode') {
        const mode = payload.mode
        if (mode !== 'off' && mode !== 'ask' && mode !== 'on') {
          throw new ReaderError('invalid-memory', '记忆模式必须是 off、ask 或 on')
        }
        companionSettings = { ...companionSettings, memory: { ...companionSettings.memory, mode } }
        await saveCompanionSettings(dataDir, companionSettings)
        await rebuildAllMemory()
        return memoryStatus(book)
      }
      if (payload.action === 'setBook') {
        const state = payload.state
        if (state !== 'inherit' && state !== 'on' && state !== 'off') {
          throw new ReaderError('invalid-memory', '单书状态必须是 inherit、on 或 off')
        }
        const books = { ...companionSettings.memory.books }
        if (state === 'inherit') delete books[book.id]
        else books[book.id] = state
        companionSettings = { ...companionSettings, memory: { ...companionSettings.memory, books } }
        await saveCompanionSettings(dataDir, companionSettings)
        await rebuildMemory(book.id)
        return memoryStatus(book)
      }
      if (payload.action === 'write') {
        const text = typeof payload.text === 'string' ? payload.text : ''
        if (payload.scope === 'reader') {
          await memoryStore.writeReader(text)
          await rebuildAllMemory()
        } else {
          await memoryStore.writeBook(book.id, text)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'undo') {
        if (payload.scope === 'reader') {
          await memoryStore.undo(null)
          await rebuildAllMemory()
        } else {
          await memoryStore.undo(book.id)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'clear') {
        if (payload.scope === 'reader') {
          await memoryStore.clearReader()
          await rebuildAllMemory()
        } else {
          await memoryStore.clearBook(book.id)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'approve') {
        const proposalId = String(payload.proposalId ?? '')
        const proposal = (await memoryProposalStore.list(book.id)).find(item => item.id === proposalId)
        if (!proposal) throw new ReaderError('proposal-not-found', '记忆提议不存在')
        if (proposal.scope === 'reader') {
          await memoryStore.writeReader(proposal.preview)
        } else {
          await memoryStore.writeBook(book.id, proposal.preview)
        }
        await memoryProposalStore.reject(book.id, proposal.id)
        const books = { ...companionSettings.memory.books, [book.id]: 'on' as const }
        companionSettings = { ...companionSettings, memory: { ...companionSettings.memory, books } }
        await saveCompanionSettings(dataDir, companionSettings)
        if (proposal.scope === 'reader') await rebuildAllMemory()
        else await rebuildMemory(book.id)
        return memoryStatus(book)
      }
      if (payload.action === 'reject') {
        await memoryProposalStore.reject(book.id, String(payload.proposalId ?? ''))
        const books = { ...companionSettings.memory.books, [book.id]: 'off' as const }
        companionSettings = { ...companionSettings, memory: { ...companionSettings.memory, books } }
        await saveCompanionSettings(dataDir, companionSettings)
        await rebuildMemory(book.id)
        return memoryStatus(book)
      }
      if (payload.action === 'status' || payload.action === undefined) return memoryStatus(book)
      throw new ReaderError('invalid-memory-action', `未知记忆操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof MemoryStoreError || error instanceof MemoryProposalError) {
        throw new ReaderError(error.code, error.message)
      }
      throw error
    }
  }

  async function memoryTool(payload: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, payload.book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(payload.book)}`)
    companionSettings = await loadCompanionSettings(dataDir)
    const effective = effectiveMemoryState(companionSettings, found.id)
    const scope = payload.scope === 'reader' ? 'reader' : 'book'
    try {
      if (payload.action === 'read') {
        const [reader, card] = await Promise.all([memoryStore.readReader(), memoryStore.readBook(found.id)])
        return {
          bookId: found.id,
          bookTitle: found.title,
          effective,
          bookCard: card.text,
          readerCard: reader.text,
        }
      }
      if (payload.action === 'forget') {
        if (effective !== 'on') throw new ReaderError('memory-off', '记忆已关闭或尚未同意')
        if (scope === 'reader') {
          await memoryStore.clearReader()
          await rebuildAllMemory()
        } else {
          await memoryStore.clearBook(found.id)
          await rebuildMemory(found.id)
        }
        return { forgotten: true, scope }
      }
      if (payload.action === 'update') {
        if (effective === 'off') throw new ReaderError('memory-off', '记忆已关闭')
        const text = typeof payload.text === 'string' ? payload.text.trim() : ''
        if (!text) throw new ReaderError('invalid-memory', '记忆内容不能为空')
        const mode = payload.mode === 'replace' ? 'replace' : 'append'
        const current = scope === 'reader'
          ? (await memoryStore.readReader()).text
          : (await memoryStore.readBook(found.id)).text
        const preview = mode === 'append' && current.trim() ? `${current.trim()}\n\n${text}` : text
        if (effective === 'ask') {
          const proposal = await memoryProposalStore.create(found.id, { scope, mode, text, preview })
          return {
            needsConsent: true,
            proposalId: proposal.id,
            preview,
            message: '记忆尚未开启，等待用户在笔记页的记忆区确认。',
          }
        }
        if (scope === 'reader') {
          await memoryStore.writeReader(preview)
          await rebuildAllMemory()
        } else {
          await memoryStore.writeBook(found.id, preview)
          await rebuildMemory(found.id)
        }
        return { saved: true, scope, characters: preview.length }
      }
      throw new ReaderError('invalid-memory-action', `未知记忆操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof MemoryStoreError || error instanceof MemoryProposalError) {
        throw new ReaderError(error.code, error.message)
      }
      throw error
    }
  }

  function memoryContextFor(sessionId: unknown): string {
    if (typeof sessionId !== 'string' || !sessionId) return ''
    const reading = companionReadings.get(sessionId)
    if (!reading) return ''
    if (effectiveMemoryState(companionSettings, reading.bookId) !== 'on') return ''
    return memoryCache.get(reading.bookId)?.text ?? ''
  }

  async function noteDrafts(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const store = await ensureNoteDraftStore()
    try {
      if (payload.action === 'list') return { drafts: await store.list(book) }
      if (payload.action === 'apply') {
        const content = await store.apply(book, String(payload.draftId ?? ''))
        if (companionSettings.notes[book.id]) await rebuildNotesContext(book.id)
        return content
      }
      if (payload.action === 'reject') {
        return { rejected: await store.reject(book, String(payload.draftId ?? '')) }
      }
      throw new ReaderError('invalid-draft-action', `未知草稿操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof NoteDraftError) throw new ReaderError(error.code, error.message)
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  async function noteDraftCreate(payload: any = {}): Promise<{
    draft: NoteDraftRecord
    autoApplied?: boolean
    note?: { id: string; title: string }
    characters?: number
    error?: string
  }> {
    const books = await libraryBooks()
    const found = findBookByKey(books, payload.book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(payload.book)}`)
    companionSettings = await loadCompanionSettings(dataDir)
    const store = await ensureNoteDraftStore()
    try {
      const draft = await store.create(found, {
        action: payload.action,
        noteId: payload.noteId ?? payload.id,
        title: payload.title,
        kind: payload.kind,
        body: payload.body,
        text: payload.text,
      })
      if (!companionSettings.autoApplyNotes) return { draft }
      try {
        const content = await store.apply(found, draft.id)
        if (companionSettings.notes[found.id]) await rebuildNotesContext(found.id)
        return {
          draft,
          autoApplied: true,
          note: { id: content.note.id, title: content.note.title },
          characters: content.body.length,
        }
      } catch (error) {
        return {
          draft,
          autoApplied: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    } catch (error) {
      if (error instanceof NoteDraftError) throw new ReaderError(error.code, error.message)
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  async function toolNoteFiles(payload: any = {}): Promise<any> {
    const books = await libraryBooks()
    const found = findBookByKey(books, payload.book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(payload.book)}`)
    const store = await ensureNoteFileStore()
    try {
      if (payload.action === 'index') {
        return { bookId: found.id, bookTitle: found.title, notes: await store.list(found) }
      }
      if (payload.action === 'read') {
        return await store.read(found, String(payload.id ?? ''))
      }
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

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

  async function handleNoteFiles(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const store = await ensureNoteFileStore()
    try {
      if (payload.action === 'list') return { notes: await store.list(book) }
      if (payload.action === 'read') return await store.read(book, String(payload.id ?? ''))
      if (payload.action === 'create') {
        const result = await store.create(book, { title: payload.title, kind: payload.kind, body: payload.body })
        if (companionSettings.notes[book.id]) await rebuildNotesContext(book.id)
        return result
      }
      if (payload.action === 'write') {
        const result = await store.write(book, String(payload.id ?? ''), {
          title: payload.title,
          body: payload.body,
          baseHash: payload.baseHash,
        })
        if (companionSettings.notes[book.id]) await rebuildNotesContext(book.id)
        return result
      }
      if (payload.action === 'remove') {
        const result = { deleted: await store.remove(book, String(payload.id ?? '')) }
        if (companionSettings.notes[book.id]) await rebuildNotesContext(book.id)
        return result
      }
      if (payload.action === 'history') {
        return { history: await store.listHistory(book, String(payload.id ?? '')) }
      }
      if (payload.action === 'restore') {
        const result = await store.restoreHistory(book, String(payload.id ?? ''), String(payload.historyId ?? ''))
        if (companionSettings.notes[book.id]) await rebuildNotesContext(book.id)
        return result
      }
      if (payload.action === 'historyRemove') {
        return { removed: await store.removeHistory(book, String(payload.id ?? ''), String(payload.historyId ?? '')) }
      }
      if (payload.action === 'historyClear') {
        return { cleared: await store.clearHistory(book, String(payload.id ?? '')) }
      }
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
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

  async function handleRpc(endpoint: string, payload?: unknown): Promise<RpcResult> {
    const handlers: Record<string, (payload?: any) => Promise<any>> = {
      state,
      rescan: state,
      configure: configureLibrary,
      open,
      chapter,
      progress: saveReadingProgress,
      session: setCompanionSession,
      companionPolicy: setCompanionPolicy,
      companionContext: setCompanionContext,
      setNoteContext,
      setAutoApplyNotes,
      memory,
      search,
      notes: handleNotes,
      noteFiles: handleNoteFiles,
      noteDrafts,
      openNoteFile,
      exportNotes,
      pageView,
      pdfPage,
      cover,
      libraryMeta,
      setBookTags,
      setBookStatus,
      setBookRating,
    }
    const handler = handlers[endpoint]
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
    syncPrompt,
    configureLibrary,
    open,
    chapter,
    saveReadingProgress,
    setCompanionSession,
    setCompanionPolicy,
    setCompanionContext,
    companionContextOf,
    setNoteContext,
    setAutoApplyNotes,
    notesContextFor,
    memory,
    memoryTool,
    memoryContextFor,
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
    toolContext,
    toolRead,
    toolSearch,
    toolNote,
    pageView,
    pdfPage,
    cover,
    epubDocument,
    epubAsset,
    handleRpc,
  }
}
