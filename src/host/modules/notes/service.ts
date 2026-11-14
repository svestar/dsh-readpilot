import type { CompanionSettings } from '../../../shared/contracts/companion.ts'
import type { LibraryMeta, Settings } from '../../../shared/contracts/library.ts'
import type { OpenResult } from '../../../shared/contracts/reading.ts'
import type { Book } from '../library/book.ts'
import { createNoteDraftStore } from './drafts.ts'
import { createDraftHandlers } from './draft-handlers.ts'
import { createNotesContext } from './context-service.ts'
import { createNotesExport } from './export-service.ts'
import { createNoteFileHandlers } from './note-file-handlers.ts'
import { createNotesHandlers } from './notes-handlers.ts'
import { createNotesStore } from './store.ts'

export interface NotesServiceOptions {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  currentSettings(): Promise<Settings>
  openBook(bookId: string): Promise<OpenResult>
  libraryMeta(): Promise<LibraryMeta>
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
}

export function createNotesService(options: NotesServiceOptions) {
  const notes = createNotesStore(options.dataDir)
  const cache = new Map<string, { text: string; characters: number; updatedAt: number }>()

  const noteFiles = createNoteFileHandlers({
    settings: options.currentSettings,
    books: options.books,
    resolveBook: options.resolveBook,
    refreshNotes: async (bookId: string) => {
      if (options.getSettings().notes[bookId]) await rebuildNotesContext(bookId)
    },
  })

  const context = createNotesContext({
    resolveBook: options.resolveBook,
    notes,
    store: noteFiles.store,
    getSettings: options.getSettings,
    setSettings: options.setSettings,
    loadSettings: options.loadSettings,
    saveSettings: options.saveSettings,
    readings: options.readings,
    cache,
  })

  const { rebuildNotesContext } = context

  const { handleNotes } = createNotesHandlers({
    resolveBook: options.resolveBook,
    notes,
    refresh: async bookId => (options.getSettings().notes[bookId] ? rebuildNotesContext(bookId) : 0),
  })

  const { noteDrafts, noteDraftCreate } = createDraftHandlers({
    books: options.books,
    findBook: options.findBook,
    resolveBook: options.resolveBook,
    loadSettings: options.loadSettings,
    store: async () => createNoteDraftStore(options.dataDir, await noteFiles.store()),
    refreshNotes: async bookId => (options.getSettings().notes[bookId] ? rebuildNotesContext(bookId) : 0),
  })

  const exporter = createNotesExport({
    resolveBook: options.resolveBook,
    openBook: options.openBook,
    store: noteFiles.store,
    notes,
    libraryMeta: options.libraryMeta,
    currentSettings: options.currentSettings,
  })

  return {
    notes,
    noteFiles: noteFiles.store,
    handleNotes,
    handleNoteFiles: noteFiles.handleNoteFiles,
    toolNoteFiles: noteFiles.toolNoteFiles,
    noteDrafts,
    noteDraftCreate,
    rebuildNotesContext,
    setNoteContext: context.setNoteContext,
    setAutoApplyNotes: context.setAutoApplyNotes,
    notesContextFor: context.notesContextFor,
    exportNotes: exporter.exportNotes,
    openNoteFile: exporter.openNoteFile,
  }
}
