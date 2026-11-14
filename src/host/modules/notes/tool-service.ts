import type { Book } from '../library/book.ts'
import type { NotesStore } from './store.ts'
import type { ReadingService } from '../reading/service.ts'
import type { ReaderReceiptInput } from '../../../shared/contracts/actions.ts'
import { ReaderError } from '../../lib/errors.ts'

export interface NotesToolDependencies {
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  notes: NotesStore
  reading: Pick<ReadingService, 'ensureParsed'>
  recordReaderReceipt(input: ReaderReceiptInput): Promise<unknown>
  notesEnabled(bookId: string): boolean
  rebuildNotesContext(bookId: string): Promise<number>
}

export function createNotesToolService(deps: NotesToolDependencies) {
  async function toolNote({ action, book, chapter, blockIndex, offset, quote, note, color, noteId }: any = {}): Promise<any> {
    const books = await deps.books()
    const found = deps.findBook(books, book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(book)}`)
    if (action === 'list') {
      return {
        bookId: found.id,
        bookTitle: found.title,
        notes: await deps.notes.list(found.id),
      }
    }
    if (action === 'update' || action === 'delete') {
      const id = typeof noteId === 'string' ? noteId : ''
      if (!id) throw new ReaderError('invalid-note', 'noteId 不能为空')
      const previous = (await deps.notes.list(found.id)).find(item => item.id === id)
      if (action === 'delete') {
        const deleted = await deps.notes.remove(found.id, id)
        if (deleted && previous) {
          await deps.recordReaderReceipt({
            type: 'annotation.delete',
            bookId: found.id,
            bookTitle: found.title,
            summary: `删除批注：${previous.quote.slice(0, 40) || previous.note.slice(0, 40)}`,
            undo: { kind: 'restoreNote', bookId: found.id, note: previous },
          })
        }
        if (deps.notesEnabled(found.id)) await deps.rebuildNotesContext(found.id)
        return { bookId: found.id, bookTitle: found.title, noteId: id, deleted }
      }
      const patch: Record<string, string> = {}
      if (typeof note === 'string') patch.note = note
      if (typeof quote === 'string') patch.quote = quote
      if (typeof color === 'string') patch.color = color
      if (Object.keys(patch).length === 0) throw new ReaderError('invalid-note', '更新批注需要 note、quote 或 color')
      const record = await deps.notes.update(found.id, id, patch)
      if (previous) {
        await deps.recordReaderReceipt({
          type: 'annotation.update',
          bookId: found.id,
          bookTitle: found.title,
          summary: `修改批注：${previous.quote.slice(0, 40) || id}`,
          undo: { kind: 'restoreNote', bookId: found.id, note: previous },
        })
      }
      if (deps.notesEnabled(found.id)) await deps.rebuildNotesContext(found.id)
      return { bookId: found.id, bookTitle: found.title, noteId: id, note: record }
    }
    if (action !== 'add') {
      throw new ReaderError('invalid-note-action', `未知笔记操作：${String(action)}`)
    }
    if (typeof quote !== 'string' || !quote.trim()) {
      throw new ReaderError('invalid-note', '批注需要引用原文')
    }
    const parsed = await deps.reading.ensureParsed(found)
    const target = parsed.chapters.find(item => item.id === chapter)
      ?? parsed.chapters.find(item => item.title === chapter)
      ?? parsed.chapters[0]
    if (!target) throw new ReaderError('chapter-not-found', '这本书没有可读的章节')
    const record = await deps.notes.add(found.id, {
      kind: 'annotation',
      color,
      chapterId: target.id,
      blockIndex: Number.isInteger(blockIndex) && blockIndex >= 0 ? blockIndex : 0,
      offset: Number.isInteger(offset) && offset >= 0 ? offset : 0,
      quote: typeof quote === 'string' ? quote : '',
      note: typeof note === 'string' ? note : '',
    })
    if (deps.notesEnabled(found.id)) await deps.rebuildNotesContext(found.id)
    await deps.recordReaderReceipt({
      type: 'annotation.add',
      bookId: found.id,
      bookTitle: found.title,
      summary: `新增批注：${record.quote.slice(0, 40) || '划线'}`,
      undo: { kind: 'deleteNote', bookId: found.id, noteId: record.id },
    })
    return {
      bookId: found.id,
      bookTitle: parsed.title || found.title,
      chapterId: target.id,
      chapterTitle: target.title,
      note: record,
    }
  }

  return { toolNote }
}
