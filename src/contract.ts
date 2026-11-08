import type { ChapterContent, OpenResult, PageViewResult, ReaderState, SearchResult } from './api.ts'
import type { LibraryMeta } from './library-meta.ts'
import type { NoteKind, NoteRecord } from './notes.ts'
import type { NoteFileKind, NoteFileRecord, NoteHistoryEntry } from './note-files.ts'
import type { NoteDraftRecord } from './note-drafts.ts'
import type { PromptPreset } from './prompt-presets.ts'
import type { ReaderAction, ReaderActionType } from './reader-actions.ts'

export interface ProgressPayload {
  bookId: string
  chapterId: string
  chapterTitle?: string
  chapterFraction?: number
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
  view?: import('./api.ts').CompanionReadingView
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
  start?: number
  end?: number
  blockHash?: string
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

/**
 * Single source of truth for client ⇄ Host operations. Keys are the operation
 * names used by `CallRpc`; a dotted suffix is the payload `action` that the
 * client wrapper injects before POSTing to the base endpoint.
 */
export interface Operations {
  state: { payload: void; result: ReaderState }
  rescan: { payload: void; result: ReaderState }
  configure: { payload: { path: string }; result: ReaderState }
  open: { payload: { bookId: string }; result: OpenResult }
  chapter: { payload: { bookId: string; chapterId: string }; result: ChapterContent }
  progress: { payload: ProgressPayload; result: { bookId: string; chapterId: string } }
  session: { payload: SessionPayload; result: { bookId: string; sessionId: string | null } }
  sessionAlive: { payload: { sessionId: string }; result: { sessionId: string; alive: boolean } }
  sessionBook: { payload: { sessionId: string }; result: import('./api.ts').SessionBookResult | null }
  companionPolicy: { payload: CompanionPolicyPayload; result: CompanionPolicyResult }
  prompts: {
    payload:
      | { action: 'list' }
      | { action: 'save'; id?: string; title: string; template: string }
      | { action: 'delete'; id: string }
      | { action: 'reset' }
    result: { presets?: PromptPreset[]; preset?: PromptPreset; deleted?: boolean }
  }
  readerActions: {
    payload: { action: 'take'; types?: ReaderActionType[]; bookId?: string }
    result: { actions: ReaderAction[] }
  }
  companionContext: { payload: CompanionContextPayload; result: CompanionContextResult }
  search: { payload: SearchPayload; result: SearchResult }
  exportNotes: { payload: ExportNotesPayload; result: ExportNotesResult }
  openNoteFile: { payload: OpenNoteFilePayload; result: OpenNoteFileResult }
  setNoteContext: { payload: SetNoteContextPayload; result: SetNoteContextResult }
  setAutoApplyNotes: { payload: SetAutoApplyNotesPayload; result: SetAutoApplyNotesResult }
  pageView: { payload: PageViewPayload; result: PageViewResult }
  libraryMeta: { payload: void; result: LibraryMeta }
  setBookTags: { payload: { bookId: string; tags: string[] }; result: { bookId: string; tags: string[] } }
  setBookStatus: { payload: { bookId: string; status: string | null }; result: { bookId: string; status: string | null } }
  setBookRating: { payload: { bookId: string; rating: number | null }; result: { bookId: string; rating: number | null } }
  'notes.list': { payload: { bookId: string }; result: { notes: NoteRecord[] } }
  'notes.add': { payload: Omit<NotesAddPayload, 'action'>; result: { note: NoteRecord } }
  'notes.update': { payload: Omit<NotesUpdatePayload, 'action'>; result: { note: NoteRecord } }
  'notes.delete': { payload: Omit<NotesDeletePayload, 'action'>; result: { deleted: boolean } }
  'noteFiles.list': { payload: { bookId: string }; result: { notes: NoteFileRecord[] } }
  'noteFiles.read': { payload: { bookId: string; id: string }; result: NoteFileContentResult }
  'noteFiles.create': { payload: Omit<NoteFilesCreatePayload, 'action'>; result: NoteFileContentResult }
  'noteFiles.write': { payload: Omit<NoteFilesWritePayload, 'action'>; result: NoteFileContentResult }
  'noteFiles.remove': { payload: { bookId: string; id: string }; result: { deleted: boolean } }
  'noteFiles.history': { payload: { bookId: string; id: string }; result: { history: NoteHistoryEntry[] } }
  'noteFiles.restore': { payload: Omit<NoteFilesRestorePayload, 'action'>; result: NoteFileContentResult }
  'noteFiles.historyRemove': { payload: Omit<NoteFilesHistoryRemovePayload, 'action'>; result: { removed: boolean } }
  'noteFiles.historyClear': { payload: { bookId: string; id: string }; result: { cleared: number } }
  'noteDrafts.list': { payload: { bookId: string }; result: { drafts: NoteDraftRecord[] } }
  'noteDrafts.apply': { payload: Omit<NoteDraftsApplyPayload, 'action'>; result: NoteFileContentResult }
  'noteDrafts.reject': { payload: Omit<NoteDraftsRejectPayload, 'action'>; result: { rejected: boolean } }
  'memory.status': { payload: { bookId: string }; result: any }
  'memory.setMode': { payload: { bookId: string; mode: string }; result: any }
  'memory.setBook': { payload: { bookId: string; state: string }; result: any }
  'memory.write': { payload: { bookId: string; scope: string; text: string }; result: any }
  'memory.undo': { payload: { bookId: string; scope: string }; result: any }
  'memory.clear': { payload: { bookId: string; scope: string }; result: any }
}

export type Operation = keyof Operations
export type OperationPayload<K extends Operation> = Operations[K]['payload']
export type OperationResult<K extends Operation> = Operations[K]['result']

type BaseOf<K extends string> = K extends `${infer Base}.${string}` ? Base : K
export type BaseEndpoint = BaseOf<Operation>

type Args<K extends Operation> = Operations[K]['payload'] extends void | undefined
  ? [payload?: undefined]
  : [payload: Operations[K]['payload']]

export type CallRpc = <K extends Operation>(
  operation: K,
  ...args: Args<K>
) => Promise<OperationResult<K>>

export const OPERATIONS: readonly Operation[] = [
  'state', 'rescan', 'configure', 'open', 'chapter', 'progress', 'session', 'sessionAlive', 'sessionBook',
  'companionPolicy', 'companionContext', 'search', 'exportNotes', 'openNoteFile',
  'setNoteContext', 'setAutoApplyNotes', 'pageView', 'libraryMeta',
  'prompts', 'readerActions',
  'setBookTags', 'setBookStatus', 'setBookRating',
  'notes.list', 'notes.add', 'notes.update', 'notes.delete',
  'noteFiles.list', 'noteFiles.read', 'noteFiles.create', 'noteFiles.write',
  'noteFiles.remove', 'noteFiles.history', 'noteFiles.restore',
  'noteFiles.historyRemove', 'noteFiles.historyClear',
  'noteDrafts.list', 'noteDrafts.apply', 'noteDrafts.reject',
  'memory.status', 'memory.setMode', 'memory.setBook', 'memory.write',
  'memory.undo', 'memory.clear',
]
