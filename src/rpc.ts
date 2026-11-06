import type { ChapterContent, OpenResult, PageViewResult, ReaderState, SearchResult } from './api.ts'
import type { LibraryMeta } from './library-meta.ts'
import type { NoteKind, NoteRecord } from './notes.ts'
import type { NoteFileKind, NoteFileRecord, NoteHistoryEntry } from './note-files.ts'
import type { NoteDraftRecord } from './note-drafts.ts'

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

export interface NoteFilesListPayload {
  action: 'list'
  bookId: string
}

export interface NoteFilesReadPayload {
  action: 'read'
  bookId: string
  id: string
}

export interface NoteFilesCreatePayload {
  action: 'create'
  bookId: string
  title: string
  kind?: NoteFileKind
  body?: string
}

export interface NoteFilesWritePayload {
  action: 'write'
  bookId: string
  id: string
  title?: string
  body: string
  baseHash?: string
}

export interface NoteFilesRemovePayload {
  action: 'remove'
  bookId: string
  id: string
}

export interface NoteFilesHistoryPayload {
  action: 'history'
  bookId: string
  id: string
}

export interface NoteFilesRestorePayload {
  action: 'restore'
  bookId: string
  id: string
  historyId: string
}

export interface NoteFilesHistoryRemovePayload {
  action: 'historyRemove'
  bookId: string
  id: string
  historyId: string
}

export interface NoteFilesHistoryClearPayload {
  action: 'historyClear'
  bookId: string
  id: string
}

export interface ExportNotesPayload {
  bookId: string
  save?: boolean
}

export interface ExportNotesResult {
  markdown: string
  fileName: string
  path?: string
}

export interface OpenNoteFilePayload {
  bookId: string
  id: string
}

export interface OpenNoteFileResult {
  opened: boolean
  path: string
}

export interface MemoryPayload {
  action: 'status' | 'setMode' | 'setBook' | 'write' | 'undo' | 'clear'
  bookId: string
  mode?: string
  state?: string
  scope?: string
  text?: string
}

export interface NoteFileContentResult {
  note: NoteFileRecord
  body: string
  hash: string
}

export interface SetNoteContextPayload {
  bookId: string
  enabled: boolean
}

export interface SetNoteContextResult {
  bookId: string
  enabled: boolean
  characters: number
}

export interface SetAutoApplyNotesPayload {
  enabled: boolean
}

export interface SetAutoApplyNotesResult {
  enabled: boolean
}

export interface NoteDraftsListPayload {
  action: 'list'
  bookId: string
}

export interface NoteDraftsApplyPayload {
  action: 'apply'
  bookId: string
  draftId: string
}

export interface NoteDraftsRejectPayload {
  action: 'reject'
  bookId: string
  draftId: string
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
  (endpoint: 'noteFiles', payload: NoteFilesListPayload): Promise<{ notes: NoteFileRecord[] }>
  (endpoint: 'noteFiles', payload: NoteFilesReadPayload): Promise<NoteFileContentResult>
  (endpoint: 'noteFiles', payload: NoteFilesCreatePayload): Promise<NoteFileContentResult>
  (endpoint: 'noteFiles', payload: NoteFilesWritePayload): Promise<NoteFileContentResult>
  (endpoint: 'noteFiles', payload: NoteFilesRemovePayload): Promise<{ deleted: boolean }>
  (endpoint: 'noteFiles', payload: NoteFilesHistoryPayload): Promise<{ history: NoteHistoryEntry[] }>
  (endpoint: 'noteFiles', payload: NoteFilesRestorePayload): Promise<NoteFileContentResult>
  (endpoint: 'noteFiles', payload: NoteFilesHistoryRemovePayload): Promise<{ removed: boolean }>
  (endpoint: 'noteFiles', payload: NoteFilesHistoryClearPayload): Promise<{ cleared: number }>
  (endpoint: 'exportNotes', payload: ExportNotesPayload): Promise<ExportNotesResult>
  (endpoint: 'openNoteFile', payload: OpenNoteFilePayload): Promise<OpenNoteFileResult>
  (endpoint: 'memory', payload: MemoryPayload): Promise<any>
  (endpoint: 'setNoteContext', payload: SetNoteContextPayload): Promise<SetNoteContextResult>
  (endpoint: 'setAutoApplyNotes', payload: SetAutoApplyNotesPayload): Promise<SetAutoApplyNotesResult>
  (endpoint: 'noteDrafts', payload: NoteDraftsListPayload): Promise<{ drafts: NoteDraftRecord[] }>
  (endpoint: 'noteDrafts', payload: NoteDraftsApplyPayload): Promise<NoteFileContentResult>
  (endpoint: 'noteDrafts', payload: NoteDraftsRejectPayload): Promise<{ rejected: boolean }>
  (endpoint: 'pageView', payload: PageViewPayload): Promise<PageViewResult>
  (endpoint: 'libraryMeta'): Promise<LibraryMeta>
  (endpoint: 'setBookTags', payload: { bookId: string; tags: string[] }): Promise<{ bookId: string; tags: string[] }>
  (endpoint: 'setBookStatus', payload: { bookId: string; status: string | null }): Promise<{ bookId: string; status: string | null }>
  (endpoint: 'setBookRating', payload: { bookId: string; rating: number | null }): Promise<{ bookId: string; rating: number | null }>
}
