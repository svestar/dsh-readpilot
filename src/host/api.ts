import type { ReaderState } from '../shared/contracts/library.ts'
import type { SearchResult } from '../shared/contracts/search.ts'
import type { Router } from './router.ts'
import { errorCode } from './lib/errors.ts'
import type { LibraryService } from './modules/library/service.ts'
import type { ReadingService } from './modules/reading/service.ts'
import type { createSearch } from './modules/search/service.ts'
import type { createNotesService } from './modules/notes/service.ts'
import type { createNotesToolService } from './modules/notes/tool-service.ts'
import type { createReadingToolService } from './modules/reading/tool-service.ts'
import type { MemoryModule } from './modules/memory/index.ts'
import type { createPromptsModule } from './modules/prompts/index.ts'
import type { createCompanionService } from './modules/companion/service.ts'
import type { createActionsService } from './modules/actions/service.ts'
import type { createBackupService } from './modules/backup/index.ts'

export interface ReaderApiDependencies {
  library: LibraryService
  reading: ReadingService
  search: ReturnType<typeof createSearch>
  notes: ReturnType<typeof createNotesService>
  notesTools: ReturnType<typeof createNotesToolService>
  readingTools: ReturnType<typeof createReadingToolService>
  memory: MemoryModule
  prompts: ReturnType<typeof createPromptsModule>['prompts']
  companion: ReturnType<typeof createCompanionService>
  actions: ReturnType<typeof createActionsService>
  backup: ReturnType<typeof createBackupService>
  router: Router
  libraryMeta(): Promise<any>
  state(): Promise<ReaderState>
  dispose(): Promise<void>
}

export function createReaderApi(deps: ReaderApiDependencies) {
  async function toolBooks(): Promise<any> {
    const snapshot = await deps.state()
    return {
      libraryDir: snapshot.settings.libraryDir,
      books: snapshot.books.map(book => ({
        id: book.id,
        title: book.title,
        format: book.format,
        supported: book.supported,
        size: book.size,
        progress: book.progress,
      })),
    }
  }

  async function toolSearch(payload: any = {}): Promise<SearchResult> {
    const found = payload.book ? await deps.library.findBook(payload.book) : undefined
    if (payload.book && !found) throw new Error(`书库中找不到书籍：${String(payload.book)}`)
    return deps.search({ ...payload, bookId: found?.id })
  }

  async function handleRpc(endpoint: string, payload?: unknown): Promise<{
    ok: boolean
    value?: any
    error?: { code: string; message: string; details: Record<string, unknown> }
  }> {
    try {
      return { ok: true, value: await deps.router.handle(endpoint, payload ?? null) }
    } catch (error) {
      return {
        ok: false,
        error: {
          code: errorCode(error, 'reader-error'),
          message: error instanceof Error ? error.message : String(error),
          details: {},
        },
      }
    }
  }

  return {
    state: () => deps.state(),
    rescan: () => deps.library.rescan(),
    syncPrompt: () => deps.library.syncPrompt(),
    configureLibrary: (payload?: { path?: unknown }) => deps.library.configure(payload),
    deleteDuplicate: (payload?: { bookId?: unknown }) => deps.library.deleteDuplicate(payload),
    backupExport: () => deps.backup.backupExport(),
    backupRestore: (payload?: any) => deps.backup.backupRestore(payload),
    open: (payload?: any) => deps.reading.open(payload),
    chapter: (payload?: any) => deps.reading.chapter(payload),
    saveReadingProgress: (payload?: any) => deps.reading.saveReadingProgress(payload),
    setCompanionSession: (payload?: any) => deps.companion.setCompanionSession(payload),
    sessionAlive: (payload?: any) => deps.companion.sessionAlive(payload),
    sessionBook: (payload?: any) => deps.companion.sessionBook(payload),
    setCompanionPolicy: (payload?: any) => deps.companion.setCompanionPolicy(payload),
    setCompanionContext: (payload?: any) => deps.companion.setCompanionContext(payload),
    syncCompanionContexts: () => deps.companion.syncCompanionContexts(),
    companionContextOf: (sessionId: unknown) => deps.companion.companionContextOf(sessionId),
    setNoteContext: (payload?: any) => deps.notes.setNoteContext(payload),
    setAutoApplyNotes: (payload?: any) => deps.notes.setAutoApplyNotes(payload),
    notesContextFor: (sessionId: unknown) => deps.notes.notesContextFor(sessionId),
    memory: (payload?: any) => deps.memory.handlers.memory(payload),
    memoryTool: (payload?: any) => deps.memory.handlers.memoryTool(payload),
    memoryContextFor: (sessionId: unknown) => deps.memory.handlers.memoryContextFor(sessionId),
    prompts: (payload?: any) => deps.prompts(payload),
    readerActions: (payload?: any) => deps.actions.readerActions(payload),
    readerReceipts: (payload?: any) => deps.actions.readerReceipts(payload),
    pushReaderAction: (action: any) => deps.actions.pushReaderAction(action),
    recordReaderReceipt: (input: any) => deps.actions.recordReaderReceipt(input),
    noteDrafts: (payload?: any) => deps.notes.noteDrafts(payload),
    noteDraftCreate: (payload?: any) => deps.notes.noteDraftCreate(payload),
    toolNoteFiles: (payload?: any) => deps.notes.toolNoteFiles(payload),
    openNoteFile: (payload?: any) => deps.notes.openNoteFile(payload),
    exportNotes: (payload?: any) => deps.notes.exportNotes(payload),
    search: (payload?: any) => deps.search(payload),
    libraryMeta: () => deps.libraryMeta(),
    setBookTags: (payload?: any) => deps.library.setBookTags(payload),
    setBookStatus: (payload?: any) => deps.library.setBookStatus(payload),
    setBookRating: (payload?: any) => deps.library.setBookRating(payload),
    toolBooks,
    toolOpen: (payload?: any) => deps.readingTools.toolOpen(payload),
    toolDigest: (payload?: any) => deps.readingTools.toolDigest(payload),
    toolContext: (payload?: any) => deps.readingTools.toolContext(payload),
    toolRead: (payload?: any) => deps.readingTools.toolRead(payload),
    toolSearch,
    toolNote: (payload?: any) => deps.notesTools.toolNote(payload),
    pageView: (payload?: any) => deps.reading.pageView(payload),
    pdfPage: (payload?: any) => deps.reading.pdfPage(payload),
    cover: (payload?: any) => deps.reading.cover(payload),
    epubDocument: (payload?: any) => deps.reading.epubDocument(payload),
    epubAsset: (payload?: any) => deps.reading.epubAsset(payload),
    bookAsset: (payload?: any) => deps.reading.bookAsset(payload),
    handleRpc,
    dispose: () => deps.dispose(),
  }
}

export type ReaderApi = ReturnType<typeof createReaderApi>
