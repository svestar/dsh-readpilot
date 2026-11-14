import type {
  ProgressMap,
  ReaderState,
  Settings,
} from '../../../shared/contracts/library.ts'
import type { CompanionSettings, SessionMap } from '../../../shared/contracts/companion.ts'
import type { NoteFileRecord } from '../../../shared/contracts/notes.ts'
import type { HostContext } from '../../types.ts'
import { ReaderError } from '../../lib/errors.ts'
import type { Book } from './book.ts'
import { findBookByKey } from './book.ts'
import { createLibraryConfigure } from './configure.ts'
import { createDuplicateService } from './duplicate.ts'
import { createLibraryMetaService, type LibraryMetaService } from './meta-service.ts'
import { createLibraryMetaStore } from './meta-store.ts'
import { createLibraryScan } from './scan.ts'
import { loadSettings } from './settings.ts'
import { createLibraryState, createWorkspaceSync } from './state.ts'

export interface LibraryServiceDependencies {
  dataDir: string
  ctx?: HostContext
  notes(bookId: string): Promise<unknown[]>
  noteFiles(book: { id: string; title: string; path?: string }): Promise<NoteFileRecord[]>
  progress(): Promise<ProgressMap>
  sessions(): Promise<SessionMap>
  companion(): Promise<CompanionSettings>
  archivedSessionIds(): string[]
}

export interface LibraryService extends LibraryMetaService {
  books(options?: { fresh?: boolean }): Promise<Book[]>
  resolveBook(bookId: unknown): Promise<Book>
  findBook(key: unknown): Promise<Book | undefined>
  currentSettings(): Promise<Settings>
  state(): Promise<ReaderState>
  rescan(): Promise<ReaderState>
  syncPrompt(): Promise<void>
  configure(payload?: { path?: unknown }): Promise<ReaderState>
  deleteDuplicate(payload?: { bookId?: unknown }): Promise<ReaderState>
  dispose(): Promise<void>
}

export function createLibraryService(deps: LibraryServiceDependencies): LibraryService {
  const currentSettings = () => loadSettings(deps.dataDir)
  const scan = createLibraryScan({ dataDir: deps.dataDir, ctx: deps.ctx, currentSettings })
  const workspace = createWorkspaceSync(currentSettings)
  const metaStore = createLibraryMetaStore(deps.dataDir)

  async function resolveBook(bookId: unknown): Promise<Book> {
    const books = await scan.books()
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(bookId)}`)
    return book
  }

  const state = createLibraryState({
    currentSettings,
    books: options => scan.books(options),
    progress: deps.progress,
    sessions: deps.sessions,
    meta: () => metaStore.list(),
    companion: deps.companion,
    archivedSessionIds: deps.archivedSessionIds,
    syncPrompt: settings => workspace.syncFor(settings),
    refreshWatch: dir => scan.refreshWatch(dir),
  })

  const configure = createLibraryConfigure({
    ctx: deps.ctx,
    dataDir: deps.dataDir,
    scan,
    state,
  })

  const deleteDuplicate = createDuplicateService({
    dataDir: deps.dataDir,
    books: options => scan.books(options),
    currentSettings,
    notes: deps.notes,
    noteFiles: deps.noteFiles,
    progress: deps.progress,
    sessions: deps.sessions,
    meta: () => metaStore.list(),
    invalidate: () => scan.invalidate(),
    state,
  })

  const meta = createLibraryMetaService({ resolveBook, store: metaStore })

  return {
    books: options => scan.books(options),
    resolveBook,
    findBook: async key => findBookByKey(await scan.books(), key),
    currentSettings,
    state,
    rescan: async () => {
      scan.invalidate()
      return state()
    },
    syncPrompt: () => workspace.syncPrompt(),
    configure,
    deleteDuplicate,
    ...meta,
    dispose: () => scan.dispose(),
  }
}
