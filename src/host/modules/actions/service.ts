import type {
  ReaderAction,
  ReaderActionInput,
  ReaderActionReceipt,
  ReaderActionType,
  ReaderReceiptInput,
} from '../../../shared/contracts/actions.ts'
import type { ReadStatus } from '../../../shared/contracts/library.ts'
import type { NoteRecord } from '../../../shared/contracts/notes.ts'
import type { Book } from '../library/book.ts'
import type { NoteFileStore } from '../notes/files/index.ts'
import { ReaderError } from '../../lib/errors.ts'
import { createReaderActionStore } from './store.ts'

export interface ActionsServiceDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  notes: {
    remove(bookId: string, noteId: string): Promise<boolean>
    restore(record: NoteRecord): Promise<NoteRecord>
  }
  noteFiles(): Promise<NoteFileStore>
  setTags(bookId: string, tags: string[]): Promise<string[]>
  setStatus(bookId: string, status: ReadStatus | null): Promise<ReadStatus | null>
  notesEnabled(bookId: string): boolean
  rebuildNotesContext(bookId: string): Promise<number>
  refreshCompanionContexts(bookId: string): Promise<void>
}

export function createActionsService(deps: ActionsServiceDependencies) {
  const store = createReaderActionStore()

  async function pushReaderAction(action: ReaderActionInput): Promise<ReaderAction> {
    return store.push(action)
  }

  async function recordReaderReceipt(input: ReaderReceiptInput): Promise<ReaderActionReceipt> {
    return store.addReceipt(input)
  }

  function recentActionSummary(bookId: string) {
    return store.listReceipts({ bookId, limit: 10 }).map(receipt => ({
      id: receipt.id,
      type: receipt.type,
      summary: receipt.summary,
      createdAt: receipt.createdAt,
      undoable: receipt.undoable,
      status: receipt.undoneAt ? 'undone_by_user' : 'applied',
      ...(receipt.undoneAt ? { undoneAt: receipt.undoneAt } : {}),
    }))
  }

  async function readerReceipts(payload: any = {}): Promise<any> {
    if (payload.action === 'list') {
      const bookId = typeof payload.bookId === 'string' ? payload.bookId : undefined
      return {
        receipts: store.listReceipts({
          bookId,
          limit: Number.isInteger(payload.limit) ? payload.limit : undefined,
        }),
      }
    }
    if (payload.action !== 'undo') {
      throw new ReaderError('invalid-reader-action', `未知动作回执操作：${String(payload.action)}`)
    }
    const receiptId = typeof payload.receiptId === 'string' ? payload.receiptId : ''
    const receipt = store.getReceipt(receiptId)
    if (!receipt) throw new ReaderError('receipt-not-found', '动作回执不存在或已过期')
    if (receipt.undoneAt) throw new ReaderError('already-undone', '这个动作已经撤销')
    if (!receipt.undo) throw new ReaderError('not-undoable', '这个动作不可撤销')
    const undo = receipt.undo
    try {
      if (undo.kind === 'deleteNote') {
        await deps.notes.remove(undo.bookId, undo.noteId)
        if (deps.notesEnabled(undo.bookId)) await deps.rebuildNotesContext(undo.bookId)
        store.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'restoreNote') {
        await deps.notes.restore(undo.note)
        if (deps.notesEnabled(undo.bookId)) await deps.rebuildNotesContext(undo.bookId)
        store.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'restoreNoteFile') {
        const book = await deps.resolveBook(undo.bookId)
        const files = await deps.noteFiles()
        await files.restore(book, undo.note, undo.body)
        store.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'deleteNoteFile') {
        const book = await deps.resolveBook(undo.bookId)
        const files = await deps.noteFiles()
        await files.remove(book, undo.noteId)
        store.push({ type: 'notesRefresh', bookId: undo.bookId })
      } else if (undo.kind === 'setTags') {
        await deps.setTags(undo.bookId, undo.tags)
        store.push({ type: 'libraryRefresh' })
      } else if (undo.kind === 'setStatus') {
        await deps.setStatus(undo.bookId, undo.status)
        store.push({ type: 'libraryRefresh' })
      }
      const updated = store.markUndone(receiptId)
      await deps.refreshCompanionContexts(undo.bookId)
      return { receipt: updated, undone: true }
    } catch (error) {
      if (error instanceof ReaderError) throw error
      throw new ReaderError('undo-failed', error instanceof Error ? error.message : String(error))
    }
  }

  async function readerActions(payload: any = {}): Promise<{ actions: ReaderAction[] }> {
    if (payload.action !== 'take') {
      throw new ReaderError('invalid-reader-action', `未知阅读动作操作：${String(payload.action)}`)
    }
    const types = Array.isArray(payload.types)
      ? payload.types.filter((value: unknown): value is ReaderActionType =>
        value === 'goto' || value === 'open_panel' || value === 'notesRefresh' || value === 'libraryRefresh')
      : undefined
    const bookId = typeof payload.bookId === 'string' ? payload.bookId : undefined
    return { actions: store.take({ types, bookId }) }
  }

  return {
    store,
    pushReaderAction,
    recordReaderReceipt,
    recentActionSummary,
    readerReceipts,
    readerActions,
  }
}
