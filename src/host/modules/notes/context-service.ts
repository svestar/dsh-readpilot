import type { CompanionSettings } from '../../../shared/contracts/companion.ts'
import type { Book } from '../library/book.ts'
import { buildReadingNotes, type ReadingNote } from './context.ts'
import type { NoteFileStore } from './files/index.ts'
import type { NotesStore } from './store.ts'
import { ReaderError } from '../../lib/errors.ts'

export interface NotesContextDependencies {
  resolveBook(bookId: unknown): Promise<Book>
  notes: NotesStore
  store(): Promise<NoteFileStore>
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
  cache: Map<string, { text: string; characters: number; updatedAt: number }>
}

export function createNotesContext({
  resolveBook,
  notes,
  store,
  getSettings,
  setSettings,
  loadSettings,
  saveSettings,
  readings,
  cache,
}: NotesContextDependencies) {
  async function rebuildNotesContext(bookId: string): Promise<number> {
    try {
      const book = await resolveBook(bookId)
      const files = await store()
      const noteFiles = await files.list(book)
      const readingNotes: ReadingNote[] = []
      for (const note of noteFiles) {
        try {
          const value = await files.read(book, note.id)
          readingNotes.push({ kind: note.kind, title: note.title, body: value.body, path: note.path })
        } catch {
          // A single unreadable note must not remove the rest of the context.
        }
      }
      const highlights = (await notes.list(book.id))
        .filter(note => note.kind === 'annotation' && note.note.trim())
        .map(note => ({ quote: note.quote, annotation: note.note }))
      const text = buildReadingNotes({ bookTitle: book.title, notes: readingNotes, highlights })
      cache.set(book.id, { text, characters: text.length, updatedAt: Date.now() })
      if (cache.size > 50) {
        const oldest = [...cache.entries()]
          .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
        for (const [id] of oldest.slice(0, cache.size - 50)) cache.delete(id)
      }
      return text.length
    } catch {
      cache.set(bookId, { text: '', characters: 0, updatedAt: Date.now() })
      return 0
    }
  }

  async function setNoteContext({ bookId, enabled }: any = {}): Promise<{ bookId: string; enabled: boolean; characters: number }> {
    const book = await resolveBook(bookId)
    if (typeof enabled !== 'boolean') throw new ReaderError('invalid-context', 'enabled 必须是布尔值')
    setSettings(await loadSettings())
    if (enabled) {
      setSettings({ ...getSettings(), notes: { ...getSettings().notes, [book.id]: true } })
    } else {
      const notesContext = { ...getSettings().notes }
      delete notesContext[book.id]
      setSettings({ ...getSettings(), notes: notesContext })
      cache.delete(book.id)
    }
    await saveSettings(getSettings())
    const characters = enabled ? await rebuildNotesContext(book.id) : 0
    return { bookId: book.id, enabled, characters }
  }

  async function setAutoApplyNotes({ enabled }: any = {}): Promise<{ enabled: boolean }> {
    if (typeof enabled !== 'boolean') throw new ReaderError('invalid-context', 'enabled 必须是布尔值')
    setSettings(await loadSettings())
    setSettings({ ...getSettings(), autoApplyNotes: enabled })
    await saveSettings(getSettings())
    return { enabled }
  }

  function notesContextFor(sessionId: unknown): string {
    if (typeof sessionId !== 'string' || !sessionId) return ''
    const reading = readings.get(sessionId)
    if (!reading || !getSettings().notes[reading.bookId]) return ''
    return cache.get(reading.bookId)?.text ?? ''
  }

  return { rebuildNotesContext, setNoteContext, setAutoApplyNotes, notesContextFor }
}
