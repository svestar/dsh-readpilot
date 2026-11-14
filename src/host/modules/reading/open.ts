import type { Chapter } from './formats.ts'
import type { BookCacheRecord } from './cache-store.ts'
import type {
  ChapterContent,
  OpenResult,
  OutlineItem,
  TocItem,
} from '../../../shared/contracts/reading.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'
import type { BookParser } from './parse.ts'
import { rewriteInlineImages } from './markdown-images.ts'

export interface ReadingOpenDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  parser: BookParser
  progress(bookId: string): Promise<import('../../../shared/contracts/library.ts').ReadingProgress | null>
}

export interface ReadingOpenService {
  open(payload?: { bookId?: unknown }): Promise<OpenResult>
  chapter(payload?: { bookId?: unknown; chapterId?: unknown }): Promise<ChapterContent>
}

export function createReadingOpen({ resolveBook, parser, progress }: ReadingOpenDependencies): ReadingOpenService {
  async function loadChapter({ bookId, chapterId }: { bookId?: unknown; chapterId?: unknown } = {}): Promise<{ book: Book; parsed: BookCacheRecord; chapter: Chapter }> {
    const book = await resolveBook(bookId)
    const parsed = await parser.ensureParsed(book)
    const chapter = parsed.chapters.find(candidate => candidate.id === chapterId) ?? parsed.chapters[0]
    if (!chapter) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    return { book, parsed, chapter }
  }

  async function open({ bookId }: { bookId?: unknown } = {}): Promise<OpenResult> {
    const book = await resolveBook(bookId)
    const readingProgress = await progress(book.id)
    if (!book.supported) {
      return { book, supported: false, toc: [], progress: readingProgress }
    }
    const parsed = await parser.ensureParsed(book)
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
          progress: readingProgress,
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
      progress: readingProgress,
      ...(typeof parsed.reflowConfidence === 'number' ? { reflowConfidence: parsed.reflowConfidence } : {}),
      ...(parsed.reflowNotes?.length ? { reflowNotes: parsed.reflowNotes } : {}),
    }
  }

  async function chapter({ bookId, chapterId }: { bookId?: unknown; chapterId?: unknown } = {}): Promise<ChapterContent> {
    const loaded = await loadChapter({ bookId, chapterId })
    return {
      chapterId: loaded.chapter.id,
      title: loaded.chapter.title,
      blocks: loaded.chapter.blocks.map(block => {
        const next = { ...block }
        if (block.type === 'image' && block.src) next.src = imageAssetUrl(loaded.book, block.src)
        if (typeof block.text === 'string') {
          next.text = rewriteInlineImages(block.text, src => imageAssetUrl(loaded.book, src))
        }
        if (block.rows) {
          next.rows = block.rows.map(row => row.map(cell => rewriteInlineImages(cell, src => imageAssetUrl(loaded.book, src))))
        }
        return next
      }),
      locator: `${loaded.book.id}:${loaded.chapter.id}`,
    }
  }

  return { open, chapter }
}

function imageAssetUrl(book: Book, src: string): string {
  const endpoint = book.format === 'epub' ? 'epub-asset' : 'book-asset'
  return `/api/dsh-readpilot/${endpoint}?bookId=${encodeURIComponent(book.id)}&path=${encodeURIComponent(src)}&v=${Math.floor(book.mtimeMs)}`
}
