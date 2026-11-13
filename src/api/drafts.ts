import type { CompanionSettings } from '../companion/settings.ts'
import type { Book } from '../books/library.ts'
import { NoteDraftError } from '../notes/drafts.ts'
import type { NoteDraftRecord, NoteDraftStore } from '../notes/drafts.ts'
import { NoteFileError } from '../notes/files.ts'
import { ReaderError } from '../reading/error.ts'

export interface DraftHandlerDeps {
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  resolveBook(bookId: unknown): Promise<Book>
  loadSettings(): Promise<CompanionSettings>
  store(): Promise<NoteDraftStore>
  refreshNotes(bookId: string): Promise<number>
}

export function createDraftHandlers({
  books,
  findBook,
  resolveBook,
  loadSettings,
  store,
  refreshNotes,
}: DraftHandlerDeps) {
  async function noteDrafts(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    const drafts = await store()
    try {
      if (payload.action === 'list') return { drafts: await drafts.list(book) }
      if (payload.action === 'apply') {
        const content = await drafts.apply(book, String(payload.draftId ?? ''))
        await refreshNotes(book.id)
        return content
      }
      if (payload.action === 'reject') {
        return { rejected: await drafts.reject(book, String(payload.draftId ?? '')) }
      }
      throw new ReaderError('invalid-draft-action', `未知草稿操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof NoteDraftError) throw new ReaderError(error.code, error.message)
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  async function noteDraftCreate(payload: any = {}): Promise<{
    draft: NoteDraftRecord
    autoApplied?: boolean
    note?: { id: string; title: string }
    characters?: number
    error?: string
  }> {
    const list = await books()
    const found = findBook(list, payload.book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(payload.book)}`)
    const settings = await loadSettings()
    const drafts = await store()
    try {
      const draft = await drafts.create(found, {
        action: payload.action,
        noteId: payload.noteId ?? payload.id,
        title: payload.title,
        kind: payload.kind,
        body: payload.body,
        text: payload.text,
      })
      if (!settings.autoApplyNotes) return { draft }
      try {
        const content = await drafts.apply(found, draft.id)
        await refreshNotes(found.id)
        return {
          draft,
          autoApplied: true,
          note: { id: content.note.id, title: content.note.title },
          characters: content.body.length,
        }
      } catch (error) {
        return {
          draft,
          autoApplied: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    } catch (error) {
      if (error instanceof NoteDraftError) throw new ReaderError(error.code, error.message)
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  return { noteDrafts, noteDraftCreate }
}
