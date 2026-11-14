import { buildReaderJumpUrl } from '../../../shared/jump-url.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'
import { buildBookDigest } from './digest.ts'
import { chapterText } from './formats.ts'
import type { ReadingService } from './service.ts'
import type { CompanionReadingView } from '../../../shared/contracts/companion.ts'

const DEFAULT_READ_LIMIT = 4000
const MAX_READ_LIMIT = 8000

export interface ReadingToolDependencies {
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  reading: ReadingService
  notes(bookId: string): Promise<Array<{ id: string; chapterId: string; quote: string; note: string }>>
  recentActions(bookId: string): Array<{ id: string; type: string; summary: string; createdAt: number; undoable: boolean; status: string }>
  ensureSessionReading(sessionId: string): Promise<{ bookId: string; title: string; chapter: string; view?: CompanionReadingView } | undefined>
  progress(): Promise<Record<string, { chapterId?: string; chapterTitle?: string; percent?: number; updatedAt?: number }>>
}

export function createReadingToolService(deps: ReadingToolDependencies) {
  async function toolOpen({ book }: any = {}): Promise<any> {
    const books = await deps.books()
    const found = deps.findBook(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    const detail = await deps.reading.open({ bookId: found.id })
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
    const books = await deps.books()
    const found = deps.findBook(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    const parsed = await deps.reading.ensureParsed(found)
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
    const books = await deps.books()
    const activeReading = typeof sessionId === 'string' ? await deps.ensureSessionReading(sessionId) : undefined
    let found: Book | undefined
    if (book) {
      found = deps.findBook(books, book)
      if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    } else {
      if (activeReading) found = books.find(candidate => candidate.id === activeReading.bookId)
      if (!found) {
        const progress = await deps.progress()
        found = books
          .filter(candidate => progress[candidate.id])
          .sort((left, right) => (progress[right.id].updatedAt ?? 0) - (progress[left.id].updatedAt ?? 0))[0]
      }
      if (!found) throw new ReaderError('no-current-book', '还没有最近阅读的书籍，请先用 reader_books 选择一本书')
    }
    const detail = await deps.reading.open({ bookId: found.id })
    const notes = await deps.notes(found.id)
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
      recentActions: deps.recentActions(found.id),
    }
  }

  async function toolRead({ book, chapter: chapterKey, offset, limit }: any = {}): Promise<any> {
    const books = await deps.books()
    const found = deps.findBook(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    const parsed = await deps.reading.ensureParsed(found)
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

  return { toolOpen, toolDigest, toolContext, toolRead }
}
