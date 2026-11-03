import type { ChapterContent, OpenResult, PageViewResult, ReaderState, SearchResult } from './api.ts'
import type { LibraryMeta } from './library-meta.ts'
import type { NoteKind, NoteRecord } from './notes.ts'

export interface ProgressPayload {
  bookId: string
  chapterId: string
  chapterTitle?: string
  percent?: number
}

export interface SessionPayload {
  bookId: string
  sessionId: string | null
}

export interface CompanionPolicyPayload {
  sessionId: string
}

export interface CompanionPolicyResult {
  sessionId: string
  mode: string | null
  applied: boolean
}

export interface CompanionContextPayload {
  sessionId: string
  bookId: string
  title: string
  chapter: string
}

export interface CompanionContextResult {
  sessionId: string
  characters: number
}

export interface SearchPayload {
  bookId: string
  query: string
  limit?: number
}

export interface PageViewPayload {
  bookId: string
  page: number
  scale: number
}

export interface NotesListPayload {
  action: 'list'
  bookId: string
}

export interface NotesAddPayload {
  action: 'add'
  bookId: string
  kind: NoteKind
  color?: string
  annotation?: string
  chapterId: string
  blockIndex: number
  offset: number
  quote: string
  note: string
  quotePrefix?: string
  quoteSuffix?: string
  textHash?: string
}

export interface NotesUpdatePayload {
  action: 'update'
  bookId: string
  noteId: string
  note?: string
  quote?: string
  annotation?: string
  color?: string
}

export interface NotesDeletePayload {
  action: 'delete'
  bookId: string
  noteId: string
}

export interface CallRpc {
  (endpoint: 'state'): Promise<ReaderState>
  (endpoint: 'rescan'): Promise<ReaderState>
  (endpoint: 'configure', payload: { path: string }): Promise<ReaderState>
  (endpoint: 'open', payload: { bookId: string }): Promise<OpenResult>
  (endpoint: 'chapter', payload: { bookId: string; chapterId: string }): Promise<ChapterContent>
  (endpoint: 'progress', payload: ProgressPayload): Promise<{ bookId: string; chapterId: string }>
  (endpoint: 'session', payload: SessionPayload): Promise<{ bookId: string; sessionId: string | null }>
  (endpoint: 'companionPolicy', payload: CompanionPolicyPayload): Promise<CompanionPolicyResult>
  (endpoint: 'companionContext', payload: CompanionContextPayload): Promise<CompanionContextResult>
  (endpoint: 'search', payload: SearchPayload): Promise<SearchResult>
  (endpoint: 'notes', payload: NotesListPayload): Promise<{ notes: NoteRecord[] }>
  (endpoint: 'notes', payload: NotesAddPayload): Promise<{ note: NoteRecord }>
  (endpoint: 'notes', payload: NotesUpdatePayload): Promise<{ note: NoteRecord }>
  (endpoint: 'notes', payload: NotesDeletePayload): Promise<{ deleted: boolean }>
  (endpoint: 'pageView', payload: PageViewPayload): Promise<PageViewResult>
  (endpoint: 'libraryMeta'): Promise<LibraryMeta>
  (endpoint: 'setBookTags', payload: { bookId: string; tags: string[] }): Promise<{ bookId: string; tags: string[] }>
}
