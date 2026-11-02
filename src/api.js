import { mkdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, resolve } from 'node:path'
import { chapterText, isSupportedFormat, parseBook } from './formats.js'
import { findBookByKey, scanLibrary } from './library.js'
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

const PARSER_VERSION = 1
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
    const [books, progress, sessions] = await Promise.all([
      libraryBooks(),
      loadProgress(dataDir),
      loadSessions(dataDir),
    ])
    return {
      settings,
      books: books.map(book => ({ ...book, progress: progress[book.id] ?? null })),
      progress,
      sessions,
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
    const parsed = parseBook(buffer, book.format, book.path)
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
    return {
      book: { ...book, title: parsed.title || book.title, author: parsed.author || '' },
      supported: true,
      toc: parsed.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        chars: chapter.chars,
      })),
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
      supported: detail.supported,
      toc: detail.toc.slice(0, 200),
      tocTruncated: detail.toc.length > 200,
      progress: detail.progress,
      message: detail.supported ? undefined : '该格式尚未实现文本解析，暂时无法阅读。',
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
    toolBooks,
    toolOpen,
    toolRead,
    toolSearch,
    handleRpc,
  }
}
