import type {
  ChapterContent,
  EpubAssetResult,
  EpubDocumentResult,
  OpenResult,
  PageViewResult,
} from '../../../shared/contracts/reading.ts'
import type { ReadingProgress, Settings } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { createReadingAssets } from './assets.ts'
import { loadProgress } from './progress-store.ts'
import { createBookParser, type BookParser } from './parse.ts'
import { createReadingOpen } from './open.ts'
import { createReadingProgress } from './progress.ts'
import type { BookCacheRecord } from './cache-store.ts'

export interface ReadingServiceDependencies {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
  currentSettings(): Promise<Settings>
  maxBookBytes?: number
}

export interface ReadingService {
  ensureParsed(book: Book): Promise<BookCacheRecord>
  open(payload?: { bookId?: unknown }): Promise<OpenResult>
  chapter(payload?: { bookId?: unknown; chapterId?: unknown }): Promise<ChapterContent>
  saveReadingProgress(payload?: any): Promise<{ bookId: string; chapterId: string }>
  pageView(payload?: any): Promise<PageViewResult>
  pdfPage(payload?: any): Promise<{ png: Buffer; contentType: string }>
  cover(payload?: any): Promise<{ bytes: Buffer; contentType: string }>
  epubDocument(payload?: any): Promise<EpubDocumentResult>
  epubAsset(payload?: any): Promise<EpubAssetResult>
  bookAsset(payload?: any): Promise<{ bytes: Buffer; contentType: string }>
}

export function createReadingService(deps: ReadingServiceDependencies): ReadingService {
  const parser: BookParser = createBookParser({ dataDir: deps.dataDir, maxBookBytes: deps.maxBookBytes })
  const progress = async (bookId: string): Promise<ReadingProgress | null> => (await loadProgress(deps.dataDir))[bookId] ?? null
  const open = createReadingOpen({ resolveBook: deps.resolveBook, parser, progress })
  const saveReadingProgress = createReadingProgress({ dataDir: deps.dataDir, resolveBook: deps.resolveBook })
  const assets = createReadingAssets({
    dataDir: deps.dataDir,
    resolveBook: deps.resolveBook,
    currentSettings: deps.currentSettings,
  })

  return {
    ensureParsed: book => parser.ensureParsed(book),
    open: open.open,
    chapter: open.chapter,
    saveReadingProgress,
    ...assets,
  }
}
