import type { ReadStatus } from './library.ts'
import type { NoteFileRecord } from './notes.ts'
import type { NoteRecord } from './notes.ts'

export const ACTIONS_ENDPOINTS = {
  readerActions: 'readerActions',
  readerReceipts: 'readerReceipts',
} as const

export type ReaderActionType = 'goto' | 'open_panel' | 'notesRefresh' | 'libraryRefresh'

export interface ReaderAction {
  id: string
  type: ReaderActionType
  bookId?: string
  bookTitle?: string
  chapterId?: string
  offset?: number
  createdAt: number
}

export interface ReaderActionInput {
  type: ReaderActionType
  bookId?: string
  bookTitle?: string
  chapterId?: string
  offset?: number
}

export interface ReaderActionFilter {
  types?: ReaderActionType[]
  bookId?: string
}

export type ReaderReceiptType =
  | 'annotation.add'
  | 'annotation.update'
  | 'annotation.delete'
  | 'longNote.write'
  | 'longNote.delete'
  | 'tag.update'
  | 'status.update'

export type ReaderUndo =
  | { kind: 'deleteNote'; bookId: string; noteId: string }
  | { kind: 'restoreNote'; bookId: string; note: NoteRecord }
  | { kind: 'restoreNoteFile'; bookId: string; note: NoteFileRecord; body: string }
  | { kind: 'deleteNoteFile'; bookId: string; noteId: string }
  | { kind: 'setTags'; bookId: string; tags: string[] }
  | { kind: 'setStatus'; bookId: string; status: ReadStatus | null }

export interface ReaderActionReceipt {
  id: string
  type: ReaderReceiptType
  bookId?: string
  bookTitle?: string
  summary: string
  createdAt: number
  undoable: boolean
  undoneAt?: number
  undo?: ReaderUndo
}

export interface ReaderReceiptInput {
  type: ReaderReceiptType
  bookId?: string
  bookTitle?: string
  summary: string
  undo?: ReaderUndo
}

export interface ReaderReceiptFilter {
  bookId?: string
  limit?: number
}
