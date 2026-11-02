import { mkdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import { chapterText, isSupportedFormat, parseBookAsync } from './formats.js'
import { findBookByKey, scanLibrary } from './library.js'
import { createLibraryMetaStore } from './library-meta.js'
import { createNotesStore } from './notes.js'
import {
  loadBookCache,
  loadProgress,
  loadSessions,
  loadSettings,
  saveBookCache,
  saveProgress,
  saveSessions,
  saveSettings,
} from './store.js'

const PARSER_VERSION = 5
const DEFAULT_MAX_BOOK_BYTES = 100 * 1024 * 1024
const DEFAULT_READ_LIMIT = 4000
const MAX_READ_LIMIT = 8000
const MAX_SEARCH_BOOKS = 20

export class ReaderError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ReaderError'
    this.code = code
  }
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

export function createReaderApi({ ctx, dataDir, config = {} }) {
  const maxBookBytes = positiveInteger(config.maxBookBytes, DEFAULT_MAX_BOOK_BYTES)
  const notesStore = createNotesStore(dataDir)
  const libraryMetaStore = createLibraryMetaStore(dataDir)
  let pdfRendererPromise
  let epubVisualPromise

  async function getPdfRenderer() {
    if (!pdfRendererPromise) {
      pdfRendererPromise = import('./visual/pdf.js').then(({ createPdfPageRenderer }) =>
        createPdfPageRenderer({ cacheDir: join(dataDir, 'cache', 'pages') }))
    }
    return pdfRendererPromise
  }

  async function getEpubVisual() {
    if (!epubVisualPromise) {
      epubVisualPromise = import('./visual/epub.js').then(({ createEpubVisual }) =>
        createEpubVisual({ dataDir }))
    }
    return epubVisualPromise
  }

  async function currentSettings() {
    return loadSettings(dataDir)
  }

  async function libraryBooks() {
    const settings = await currentSettings()
    if (!settings.libraryDir) return []
    return scanLibrary(settings.libraryDir)
  }

  async function state() {
    const settings = await currentSettings()
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

  async function configureLibrary({ path } = {}) {
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
    const registry = ctx.get('workspaceRegistry')
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

  async function libraryMeta() {
    return libraryMetaStore.list()
  }

  async function setBookTags({ bookId, tags } = {}) {
    const book = await resolveBook(bookId)
    let normalized
    try {
      normalized = await libraryMetaStore.setTags(book.id, tags)
    } catch (error) {
      throw new ReaderError('invalid-tags', error.message)
    }
    return { bookId: book.id, tags: normalized }
  }

  async function resolveBook(bookId) {
    const books = await libraryBooks()
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(bookId)}`)
    return book
  }

  async function ensureParsed(book) {
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
    const record = {
      parserVersion: PARSER_VERSION,
      source: { path: book.path, mtimeMs: info.mtimeMs, size: info.size },
      ...parsed,
    }
    await saveBookCache(dataDir, book.id, record)
    return record
  }

  async function open({ bookId } = {}) {
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
    return {
      book: { ...book, title: parsed.title || book.title, author: parsed.author || '' },
      supported: true,
      toc: parsed.chapters.map(chapter => {
        const item = { id: chapter.id, title: chapter.title, chars: chapter.chars }
        if (Number.isInteger(chapter.page)) item.page = chapter.page
        if (typeof chapter.href === 'string') item.href = chapter.href
        return item
      }),
      outline: (Array.isArray(parsed.outline) ? parsed.outline : []).map(item => {
        const chapter = parsed.chapters.find(entry => entry.page === item.page)
        return {
          id: item.id,
          title: item.title,
          level: item.level,
          page: item.page,
          ...(chapter ? { chapterId: chapter.id } : {}),
        }
      }),
      progress,
    }
  }

  async function loadChapter({ bookId, chapterId } = {}) {
    const book = await resolveBook(bookId)
    const parsed = await ensureParsed(book)
    const chapter = parsed.chapters.find(candidate => candidate.id === chapterId) ?? parsed.chapters[0]
    if (!chapter) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    return { book, parsed, chapter }
  }

  async function chapter({ bookId, chapterId } = {}) {
    const loaded = await loadChapter({ bookId, chapterId })
    return {
      chapterId: loaded.chapter.id,
      title: loaded.chapter.title,
      blocks: loaded.chapter.blocks,
      locator: `${loaded.book.id}:${loaded.chapter.id}`,
    }
  }

  async function saveReadingProgress({ bookId, chapterId, chapterTitle } = {}) {
    if (typeof bookId !== 'string' || typeof chapterId !== 'string') {
      throw new ReaderError('invalid-progress', '进度需要 bookId 与 chapterId')
    }
    const book = await resolveBook(bookId)
    const progress = await loadProgress(dataDir)
    progress[book.id] = {
      chapterId,
      chapterTitle: typeof chapterTitle === 'string' ? chapterTitle : '',
      updatedAt: Date.now(),
    }
    await saveProgress(dataDir, progress)
    return { bookId: book.id, chapterId }
  }

  async function setCompanionSession({ bookId, sessionId } = {}) {
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

  async function search({ bookId, query, limit } = {}) {
    if (typeof query !== 'string' || query.trim().length < 2) {
      throw new ReaderError('invalid-query', '检索词至少需要 2 个字符')
    }
    const wanted = query.trim()
    const lowered = wanted.toLowerCase()
    const maxResults = Math.min(positiveInteger(limit, 20), 50)
    const books = bookId
      ? [await resolveBook(bookId)]
      : (await libraryBooks()).filter(book => book.supported).slice(0, MAX_SEARCH_BOOKS)
    const matches = []
    let truncated = false

    for (const book of books) {
      if (!book.supported) continue
      let parsed
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

  async function toolBooks() {
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

  async function toolOpen({ book } = {}) {
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

  async function toolRead({ book, chapter: chapterKey, offset, limit } = {}) {
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

  async function toolSearch({ book, query, limit } = {}) {
    const books = await libraryBooks()
    const found = book ? findBookByKey(books, book) : undefined
    if (book && !found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    return search({ bookId: found?.id, query, limit })
  }

  async function toolNote({ action, book, chapter, blockIndex, offset, quote, note } = {}) {
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

  async function handleNotes(payload = {}) {
    const book = await resolveBook(payload.bookId)
    if (payload.action === 'list') {
      return { notes: await notesStore.list(book.id) }
    }
    if (payload.action === 'add') {
      const record = await notesStore.add(book.id, {
        chapterId: payload.chapterId,
        blockIndex: payload.blockIndex,
        offset: payload.offset,
        quote: payload.quote,
        note: payload.note,
      })
      return { note: record }
    }
    if (payload.action === 'update') {
      const patch = {}
      if (typeof payload.note === 'string') patch.note = payload.note
      if (typeof payload.quote === 'string') patch.quote = payload.quote
      return { note: await notesStore.update(book.id, payload.noteId, patch) }
    }
    if (payload.action === 'delete') {
      return { deleted: await notesStore.remove(book.id, payload.noteId) }
    }
    throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
  }

  async function pageView({ bookId, page, scale } = {}) {
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

  async function pdfPage(payload = {}) {
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

  async function epubDocument({ bookId, href } = {}) {
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

  async function epubAsset({ bookId, path } = {}) {
    const book = await resolveBook(bookId)
    if (book.format !== 'epub') throw new ReaderError('not-epub', '只有 EPUB 支持原书资源')
    if (typeof path !== 'string' || !path) throw new ReaderError('invalid-path', '缺少 EPUB 资源路径')
    const visual = await getEpubVisual()
    return visual.readAsset({ bookId: book.id, filePath: book.path, path })
  }

  async function handleRpc(endpoint, payload) {
    const handlers = {
      state,
      rescan: state,
      configure: configureLibrary,
      open,
      chapter,
      progress: saveReadingProgress,
      session: setCompanionSession,
      search,
      notes: handleNotes,
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
      return { ok: false, error: { code, message: error.message, details: {} } }
    }
  }

  return {
    state,
    configureLibrary,
    open,
    chapter,
    saveReadingProgress,
    setCompanionSession,
    search,
    libraryMeta,
    setBookTags,
    toolBooks,
    toolOpen,
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
