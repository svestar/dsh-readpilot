export const SEARCH_ENDPOINT = 'search'

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

export const SEARCH_RESULT_KEYS = [
  'matches',
  'truncated',
  'query',
  'booksScanned',
  'booksTotal',
  'unreadable',
] as const
