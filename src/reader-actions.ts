import { randomBytes } from 'node:crypto'
import type { NoteFileRecord } from './note-files.ts'
import type { NoteRecord } from './notes.ts'
import type { ReadStatus } from './library-meta.ts'

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

export interface ReaderActionStore {
  push(action: ReaderActionInput): ReaderAction
  take(filter?: ReaderActionFilter): ReaderAction[]
  addReceipt(input: ReaderReceiptInput): ReaderActionReceipt
  listReceipts(filter?: ReaderReceiptFilter): ReaderActionReceipt[]
  getReceipt(id: string): ReaderActionReceipt | null
  markUndone(id: string): ReaderActionReceipt | null
}

const TTL_MS = 120_000
const RECEIPT_TTL_MS = 600_000
const MAX_ACTIONS = 100
const MAX_RECEIPTS = 100

export function createReaderActionStore(): ReaderActionStore {
  let queue: ReaderAction[] = []
  let receipts: ReaderActionReceipt[] = []
  const prune = () => {
    const now = Date.now()
    queue = queue.filter(action => now - action.createdAt <= TTL_MS).slice(-MAX_ACTIONS)
    receipts = receipts.filter(receipt => now - receipt.createdAt <= RECEIPT_TTL_MS).slice(-MAX_RECEIPTS)
  }
  return {
    push(action) {
      prune()
      const entry: ReaderAction = {
        ...action,
        id: `action-${randomBytes(5).toString('hex')}`,
        createdAt: Date.now(),
      }
      queue.push(entry)
      return entry
    },
    take(filter = {}) {
      prune()
      const taken: ReaderAction[] = []
      const kept: ReaderAction[] = []
      for (const action of queue) {
        if (filter.types && !filter.types.includes(action.type)) {
          kept.push(action)
          continue
        }
        if (action.type === 'notesRefresh' && filter.bookId && action.bookId && action.bookId !== filter.bookId) {
          kept.push(action)
          continue
        }
        taken.push(action)
      }
      queue = kept
      return taken
    },
    addReceipt(input) {
      prune()
      const receipt: ReaderActionReceipt = {
        ...input,
        id: `receipt-${randomBytes(5).toString('hex')}`,
        createdAt: Date.now(),
        undoable: Boolean(input.undo),
      }
      receipts.push(receipt)
      return receipt
    },
    listReceipts(filter = {}) {
      prune()
      const limit = Math.min(Math.max(filter.limit ?? 20, 1), 100)
      return receipts
        .filter(receipt => !filter.bookId || receipt.bookId === filter.bookId)
        .slice()
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, limit)
    },
    getReceipt(id) {
      prune()
      return receipts.find(receipt => receipt.id === id) ?? null
    },
    markUndone(id) {
      prune()
      const receipt = receipts.find(item => item.id === id)
      if (!receipt) return null
      receipt.undoneAt = Date.now()
      return receipt
    },
  }
}
