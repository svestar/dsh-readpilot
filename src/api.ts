import { mkdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import type { Chapter, TextBlock } from './formats.ts'
import { chapterText, isSupportedFormat, parseBookAsync } from './formats.ts'
import type { Book } from './library.ts'
import { findBookByKey, scanLibrary } from './library.ts'
import type { LibraryMeta, TagMap } from './library-meta.ts'
import { createLibraryMetaStore } from './library-meta.ts'
import type { NotesStore } from './notes.ts'
import { createNotesStore } from './notes.ts'
import type { NoteFileStore } from './note-files.ts'
import { NOTES_DIR_NAME, NoteFileError, createNoteFileStore } from './note-files.ts'
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
const MAX_SEARCH_BOOKS = 20

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

export interface ReaderState {
  settings: Settings
  books: BookWithProgress[]
  progress: ProgressMap
  sessions: SessionMap
  tags: TagMap
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
  search(payload?: any): Promise<SearchResult>
  libraryMeta(): Promise<LibraryMeta>
  setBookTags(payload?: { bookId?: unknown; tags?: unknown }): Promise<{ bookId: string; tags: string[] }>
  toolBooks(): Promise<any>
  toolOpen(payload?: any): Promise<any>
  toolContext(payload?: any): Promise<any>
  toolRead(payload?: any): Promise<any>
  toolSearch(payload?: any): Promise<any>
  toolNote(payload?: any): Promise<any>
  pageView(payload?: any): Promise<PageViewResult>
  pdfPage(payload?: any): Promise<{ png: Buffer; contentType: string }>
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

function positiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : fallback
}

export function createReaderApi({ ctx, dataDir, config = {} }: ReaderApiOptions): ReaderApi {
  const maxBookBytes = positiveInteger(config.maxBookBytes, DEFAULT_MAX_BOOK_BYTES)
  const notesStore: NotesStore = createNotesStore(dataDir)
  const libraryMetaStore = createLibraryMetaStore(dataDir)
  const readOnlySessions = new Set<string>()
  const companionContexts = new Map<string, { text: string; updatedAt: number }>()
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
    const [books, progress, sessions, meta] = await Promise.all([
      libraryBooks(),
      loadProgress(dataDir),
      loadSessions(dataDir),
      libraryMetaStore.list(),
    ])
    return {
      settings,
      books: books.map(book => ({ ...book, progress: progress[book.id] ?? null })),
      progress,
      sessions,
      tags: meta.tags,
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
      toc: detail.toc.slice(0, 200),
      tocTruncated: detail.toc.length > 200,
      progress: detail.progress,
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
      progress: detail.progress,
      toc: detail.toc.slice(0, 60),
      tocTruncated: detail.toc.length > 60,
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
      return { note: record }
    }
    if (payload.action === 'update') {
      const patch: Record<string, string> = {}
      if (typeof payload.note === 'string') patch.note = payload.note
      if (typeof payload.quote === 'string') patch.quote = payload.quote
      if (typeof payload.annotation === 'string') patch.annotation = payload.annotation
      if (typeof payload.color === 'string') patch.color = payload.color
      return { note: await notesStore.update(book.id, payload.noteId, patch) }
    }
    if (payload.action === 'delete') {
      return { deleted: await notesStore.remove(book.id, payload.noteId) }
    }
    throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
  }

  async function handleNoteFiles(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const root = join(settings.libraryDir, NOTES_DIR_NAME)
    if (!noteFileStore || noteFileRoot !== root) {
      noteFileStore = createNoteFileStore(root)
      noteFileRoot = root
    }
    const store = noteFileStore as NoteFileStore
    try {
      if (payload.action === 'list') return { notes: await store.list(book) }
      if (payload.action === 'read') return await store.read(book, String(payload.id ?? ''))
      if (payload.action === 'create') {
        return await store.create(book, { title: payload.title, kind: payload.kind, body: payload.body })
      }
      if (payload.action === 'write') {
        return await store.write(book, String(payload.id ?? ''), {
          title: payload.title,
          body: payload.body,
          baseHash: payload.baseHash,
        })
      }
      if (payload.action === 'remove') return { deleted: await store.remove(book, String(payload.id ?? '')) }
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

  async function epubDocument({ bookId, href }: any = {}): Promise<EpubDocumentResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'epub') throw new ReaderError('not-epub', '只有 EPUB 支持原书渲染')
    if (typeof href !== 'string' || !href) throw new ReaderError('invalid-href', '缺少 EPUB 章节 href')
    const visual = await getEpubVisual()
    return visual.readDocument({
      bookId: book.id,
      filePath: book.path,
      href,
      assetBase: '/api/dsh-reader/epub-asset',
      docBase: '/api/dsh-reader/epub-doc',
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
      search,
      notes: handleNotes,
      noteFiles: handleNoteFiles,
      pageView,
      libraryMeta,
      setBookTags,
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
    search,
    libraryMeta,
    setBookTags,
    toolBooks,
    toolOpen,
    toolContext,
    toolRead,
    toolSearch,
    toolNote,
    pageView,
    pdfPage,
    epubDocument,
    epubAsset,
    handleRpc,
  }
}
