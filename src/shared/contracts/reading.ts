import type { BookFormat } from '../book-format.ts'

export type { BookFormat } from '../book-format.ts'

export const READING_ENDPOINTS = {
  open: 'open',
  chapter: 'chapter',
  progress: 'progress',
  pageView: 'pageView',
} as const

export type ReadingEndpoint = (typeof READING_ENDPOINTS)[keyof typeof READING_ENDPOINTS]

/** Shared text block shape used by the Host parser and the Client renderer. */
export type BlockType = 'p' | 'h' | 'quote' | 'code' | 'li' | 'table' | 'image'

export interface TextBlock {
  type: BlockType
  text: string
  level?: number
  ordered?: boolean
  index?: number
  checked?: boolean
  indent?: number
  lang?: string
  rows?: string[][]
  src?: string
  alt?: string
  footnoteId?: string
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

export interface ChapterContent {
  chapterId: string
  title: string
  blocks: TextBlock[]
  locator: string
}

export interface BookSummary {
  id: string
  title: string
  path: string
  format: BookFormat
  supported: boolean
  size: number
  mtimeMs: number
  contentKey: string
  duplicateOf?: string
}

export interface OpenBook extends BookSummary {
  author?: string
}

export interface OpenResult {
  book: OpenBook
  supported: boolean
  toc: TocItem[]
  outline?: OutlineItem[]
  progress: import('./library.ts').ReadingProgress | null
  reflowConfidence?: number
  reflowNotes?: string[]
  scanOnly?: boolean
  pageCount?: number
}

export interface PdfTextItem {
  text: string
  left: number
  top: number
  width: number
  height: number
  fontSize: number
}

export interface PageViewResult {
  width: number
  height: number
  pageCount: number
  textItems: PdfTextItem[]
}

export interface EpubDocumentResult {
  html: string
  contentType: string
}

export interface EpubAssetResult {
  bytes: Uint8Array
  contentType: string
}

export const OPEN_RESULT_KEYS = [
  'book',
  'supported',
  'toc',
  'progress',
] as const

export const CHAPTER_CONTENT_KEYS = ['chapterId', 'title', 'blocks', 'locator'] as const
export const PAGE_VIEW_KEYS = ['width', 'height', 'pageCount', 'textItems'] as const

