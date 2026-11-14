import type { Book } from '../library/book.ts'
import type { NotesStore } from './store.ts'
import { ReaderError } from '../../lib/errors.ts'

export interface NotesHandlerDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  notes: NotesStore
  refresh(bookId: string): Promise<number>
}

export function createNotesHandlers({ resolveBook, notes, refresh }: NotesHandlerDependencies) {
  async function handleNotes(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const touch = async () => {
      await refresh(book.id)
    }
    if (payload.action === 'list') {
      return { notes: await notes.list(book.id) }
    }
    if (payload.action === 'add') {
      const record = await notes.add(book.id, {
        kind: payload.kind,
        color: payload.color,
        chapterId: payload.chapterId,
        blockIndex: payload.blockIndex,
        offset: payload.offset,
        quote: payload.quote,
        note: payload.note,
        annotation: payload.annotation,
        quotePrefix: payload.quotePrefix,
        quoteSuffix: payload.quoteSuffix,
        textHash: payload.textHash,
        start: payload.start,
        end: payload.end,
        blockHash: payload.blockHash,
      })
      await touch()
      return { note: record }
    }
    if (payload.action === 'update') {
      const patch: Record<string, string> = {}
      if (typeof payload.note === 'string') patch.note = payload.note
      if (typeof payload.quote === 'string') patch.quote = payload.quote
      if (typeof payload.annotation === 'string') patch.annotation = payload.annotation
      if (typeof payload.color === 'string') patch.color = payload.color
      const record = await notes.update(book.id, payload.noteId, patch)
      await touch()
      return { note: record }
    }
    if (payload.action === 'delete') {
      const deleted = await notes.remove(book.id, payload.noteId)
      await touch()
      return { deleted }
    }
    throw new ReaderError('invalid-note-action', `未知笔记操作：${String(payload.action)}`)
  }

  return { handleNotes }
}
