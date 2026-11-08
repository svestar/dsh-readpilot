import { join } from 'node:path'
import type { Book } from './library.ts'
import { findBookByKey } from './library.ts'
import { NOTES_DIR_NAME, NoteFileError, createNoteFileStore } from './note-files.ts'
import type { NoteFileStore } from './note-files.ts'
import { ReaderError } from './reader-error.ts'
import type { Settings } from './store.ts'

export interface NoteFileHandlerDeps {
  settings(): Promise<Settings>
  books(): Promise<Book[]>
  resolveBook(bookId: unknown): Promise<Book>
  refreshNotes(bookId: string): Promise<void>
}

export function createNoteFileHandlers({ settings, books, resolveBook, refreshNotes }: NoteFileHandlerDeps) {
  let store: NoteFileStore | null = null
  let root: string | null = null

  async function ensureStore(): Promise<NoteFileStore> {
    const current = await settings()
    if (!current.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const dir = join(current.libraryDir, NOTES_DIR_NAME)
    if (!store || root !== dir) {
      store = createNoteFileStore(dir)
      root = dir
    }
    return store
  }

  async function handleNoteFiles(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const files = await ensureStore()
    try {
      if (payload.action === 'list') return { notes: await files.list(book) }
      if (payload.action === 'read') return await files.read(book, String(payload.id ?? ''))
      if (payload.action === 'create') {
        const result = await files.create(book, { title: payload.title, kind: payload.kind, body: payload.body })
        await refreshNotes(book.id)
        return result
      }
      if (payload.action === 'write') {
        const result = await files.write(book, String(payload.id ?? ''), {
          title: payload.title,
          body: payload.body,
          baseHash: payload.baseHash,
        })
        await refreshNotes(book.id)
        return result
      }
      if (payload.action === 'remove') {
        const result = { deleted: await files.remove(book, String(payload.id ?? '')) }
        await refreshNotes(book.id)
        return result
      }
      if (payload.action === 'history') {
        return { history: await files.listHistory(book, String(payload.id ?? '')) }
      }
      if (payload.action === 'restore') {
        const result = await files.restoreHistory(book, String(payload.id ?? ''), String(payload.historyId ?? ''))
        await refreshNotes(book.id)
        return result
      }
      if (payload.action === 'historyRemove') {
        return { removed: await files.removeHistory(book, String(payload.id ?? ''), String(payload.historyId ?? '')) }
      }
      if (payload.action === 'historyClear') {
        return { cleared: await files.clearHistory(book, String(payload.id ?? '')) }
      }
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  async function toolNoteFiles(payload: any = {}): Promise<any> {
    const all = await books()
    const found = findBookByKey(all, payload.book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(payload.book)}`)
    const files = await ensureStore()
    try {
      if (payload.action === 'index') {
        return { bookId: found.id, bookTitle: found.title, notes: await files.list(found) }
      }
      if (payload.action === 'read') {
        return await files.read(found, String(payload.id ?? ''))
      }
      if (payload.action === 'remove') {
        const id = String(payload.id ?? '')
        const deleted = await files.remove(found, id)
        await refreshNotes(found.id)
        return { bookId: found.id, bookTitle: found.title, noteId: id, deleted }
      }
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  return { store: ensureStore, handleNoteFiles, toolNoteFiles }
}
