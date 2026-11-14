import type { BookFormat } from '../book-format.ts'
import type { CompanionSettings, SessionMap } from './companion.ts'
import type { BookSummary } from './reading.ts'

export const LIBRARY_ENDPOINTS = {
  state: 'state',
  rescan: 'rescan',
  configure: 'configure',
  deleteDuplicate: 'deleteDuplicate',
  libraryMeta: 'libraryMeta',
  setBookTags: 'setBookTags',
  setBookStatus: 'setBookStatus',
  setBookRating: 'setBookRating',
} as const

export type LibraryEndpoint = (typeof LIBRARY_ENDPOINTS)[keyof typeof LIBRARY_ENDPOINTS]

export interface Settings {
  libraryDir: string | null
  workspaceId: string | null
  title?: string
}

export interface ReadingProgress {
  chapterId?: string
  chapterTitle?: string
  chapterFraction?: number
  percent?: number
  updatedAt?: number
}

export type ProgressMap = Record<string, ReadingProgress>

export type TagMap = Record<string, string[]>
export type ReadStatus = 'want' | 'reading' | 'done'
export type StatusMap = Record<string, ReadStatus>
export type RatingMap = Record<string, number>

export interface LibraryMeta {
  tags: TagMap
  status: StatusMap
  rating: RatingMap
}

export interface BookWithProgress extends BookSummary {
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

export const READER_STATE_KEYS = [
  'settings',
  'books',
  'progress',
  'sessions',
  'tags',
  'status',
  'rating',
  'companion',
] as const

export const BOOK_FORMATS: readonly BookFormat[] = ['txt', 'md', 'epub', 'pdf']
