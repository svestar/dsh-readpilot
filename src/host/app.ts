import type { MediaRoute, HostModule } from './types.ts'
import type { CompanionSettings } from '../shared/contracts/companion.ts'
import { DEFAULT_COMPANION_SETTINGS, effectiveMemoryState } from '../shared/contracts/companion.ts'
import type { ReaderState } from '../shared/contracts/library.ts'
import { createRouter, type Router } from './router.ts'
import { createMediaModule } from './modules/media/index.ts'
import { createLibraryModule } from './modules/library/index.ts'
import { createReadingModule } from './modules/reading/index.ts'
import { createSearchModule } from './modules/search/index.ts'
import { createNotesModule } from './modules/notes/index.ts'
import { createMemoryModule } from './modules/memory/index.ts'
import { createPromptsModule } from './modules/prompts/index.ts'
import { createCompanionModule } from './modules/companion/index.ts'
import { createActionsModule } from './modules/actions/index.ts'
import { createBackupModule } from './modules/backup/index.ts'
import { createReadingToolService } from './modules/reading/tool-service.ts'
import { createNotesToolService } from './modules/notes/tool-service.ts'
import { createLibraryTools } from './modules/library/tools.ts'
import { createReadingTools } from './modules/reading/tools.ts'
import { createSearchTools } from './modules/search/tools.ts'
import { createNotesTools } from './modules/notes/tools.ts'
import { createMemoryTools } from './modules/memory/tools.ts'
import { createActionTools } from './modules/actions/tools.ts'
import { createReaderApi as createApiFacade, type ReaderApi } from './api.ts'
import { loadProgress } from './modules/reading/progress-store.ts'
import { loadSessions } from './modules/companion/session-store.ts'
import { loadCompanionSettings, saveCompanionSettings } from './modules/companion/settings-store.ts'
import { loadLibraryIndex, reconcileBooks } from './modules/library/index-store.ts'
import { scanLibrary } from './modules/library/book.ts'
import type { ReaderToolApi } from './modules/tools/facade.ts'

const APP_VERSION = '0.4.0'

export interface CreateAppOptions {
  dataDir: string
  ctx?: any
  maxBookBytes?: number
}

export interface PluginApp {
  api: ReaderApi
  modules: HostModule[]
  router: Router
  mediaRoutes: MediaRoute[]
  dispose(): Promise<void>
}

export function createApp({ dataDir, ctx, maxBookBytes }: CreateAppOptions): PluginApp {
  const companionState: { settings: CompanionSettings } = { settings: { ...DEFAULT_COMPANION_SETTINGS } }
  const readings = new Map<string, { bookId: string; title: string; chapter: string; view?: any; updatedAt: number }>()
  const contexts = new Map<string, { text: string; updatedAt: number }>()
  const getSettings = () => companionState.settings
  const setSettings = (value: CompanionSettings) => { companionState.settings = value }
  const loadSettings = () => loadCompanionSettings(dataDir)
  const saveSettings = async (value: CompanionSettings) => {
    companionState.settings = value
    await saveCompanionSettings(dataDir, value)
  }

  const archivedSessionIds = (): string[] => {
    const registry = ctx?.get('workspaceRegistry') as { archivedSessionIds?: unknown } | undefined
    const ids = registry?.archivedSessionIds
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  }

  const notesRef: { current?: ReturnType<typeof createNotesModule> } = {}
  const companionRef: { current?: ReturnType<typeof createCompanionModule> } = {}

  const libraryModule = createLibraryModule({
    dataDir,
    ctx,
    notes: async bookId => notesRef.current?.service.notes.list(bookId) ?? [],
    noteFiles: async book => {
      const store = await notesRef.current?.service.noteFiles()
      return store ? store.list(book) : []
    },
    progress: () => loadProgress(dataDir),
    sessions: () => loadSessions(dataDir),
    companion: () => loadCompanionSettings(dataDir),
    archivedSessionIds,
  })
  const library = libraryModule.service

  const readingModule = createReadingModule({
    dataDir,
    resolveBook: library.resolveBook,
    currentSettings: library.currentSettings,
    maxBookBytes,
  })
  const reading = readingModule.service

  const notesModule = createNotesModule({
    dataDir,
    resolveBook: library.resolveBook,
    books: () => library.books(),
    findBook: (books, key) => books.find(book => book.id === key || book.title === key),
    currentSettings: library.currentSettings,
    openBook: bookId => reading.open({ bookId }),
    libraryMeta: () => library.libraryMeta(),
    getSettings,
    setSettings,
    loadSettings,
    saveSettings,
    readings,
  })
  notesRef.current = notesModule
  const notes = notesModule.service

  const memoryModule = createMemoryModule({
    dataDir,
    resolveBook: library.resolveBook,
    books: () => library.books(),
    findBook: (books, key) => books.find(book => book.id === key || book.title === key),
    getSettings,
    setSettings,
    loadSettings,
    saveSettings,
    readings,
  })

  const actionsModule = createActionsModule({
    resolveBook: library.resolveBook,
    notes: notes.notes,
    noteFiles: notes.noteFiles,
    setTags: async (bookId, tags) => (await library.setBookTags({ bookId, tags })).tags,
    setStatus: async (bookId, status) => (await library.setBookStatus({ bookId, status })).status,
    notesEnabled: bookId => getSettings().notes[bookId] === true,
    rebuildNotesContext: bookId => notes.rebuildNotesContext(bookId),
    refreshCompanionContexts: bookId => companionRef.current?.service.refreshCompanionContexts(bookId) ?? Promise.resolve(),
  })
  const actions = actionsModule.service

  const companionModule = createCompanionModule({
    dataDir,
    ctx,
    books: () => library.books(),
    progress: () => loadProgress(dataDir),
    getSettings,
    setSettings,
    loadSettings,
    notes: {
      enabled: bookId => getSettings().notes[bookId] === true,
      rebuild: bookId => notes.rebuildNotesContext(bookId),
    },
    memory: {
      enabled: bookId => effectiveMemoryState(getSettings(), bookId) === 'on',
      rebuild: bookId => memoryModule.handlers.rebuildMemory(bookId),
    },
    recentActions: bookId => actions.recentActionSummary(bookId),
    readings,
    contexts,
  })
  companionRef.current = companionModule
  const companion = companionModule.service

  const searchModule = createSearchModule({
    resolveBook: library.resolveBook,
    libraryBooks: () => library.books(),
    ensureParsed: book => reading.ensureParsed(book),
  })
  const promptsModule = createPromptsModule({ dataDir })
  const backupModule = createBackupModule({
    dataDir,
    appVersion: APP_VERSION,
    books: () => library.books(),
    targetBooks: async libraryDir => reconcileBooks(await scanLibrary(libraryDir), await loadLibraryIndex(dataDir)),
    currentSettings: library.currentSettings,
    configureLibrary: payload => library.configure(payload),
  })
  const mediaModule = createMediaModule()

  const modules: HostModule[] = [
    libraryModule.module,
    readingModule.module,
    searchModule.module,
    notesModule.module,
    memoryModule.module,
    promptsModule.module,
    companionModule.module,
    actionsModule.module,
    backupModule.module,
    mediaModule,
  ]
  const router = createRouter(modules)
  const state = (): Promise<ReaderState> => library.state()

  const readingTools = createReadingToolService({
    books: () => library.books(),
    findBook: (books, key) => books.find(book => book.id === key || book.title === key),
    reading,
    notes: bookId => notes.notes.list(bookId),
    recentActions: bookId => actions.recentActionSummary(bookId),
    ensureSessionReading: sessionId => companion.ensureSessionReading(sessionId),
    progress: () => loadProgress(dataDir),
  })
  const notesTools = createNotesToolService({
    books: () => library.books(),
    findBook: (books, key) => books.find(book => book.id === key || book.title === key),
    notes: notes.notes,
    reading,
    recordReaderReceipt: input => actions.recordReaderReceipt(input),
    notesEnabled: bookId => getSettings().notes[bookId] === true,
    rebuildNotesContext: bookId => notes.rebuildNotesContext(bookId),
  })

  const api = createApiFacade({
    library,
    reading,
    search: searchModule.search,
    notes,
    notesTools,
    readingTools,
    memory: memoryModule,
    prompts: promptsModule.prompts,
    companion,
    actions,
    backup: backupModule.service,
    router,
    libraryMeta: () => library.libraryMeta(),
    state,
    dispose: () => library.dispose(),
  })

  const toolApi: ReaderToolApi = {
    toolBooks: () => api.toolBooks(),
    toolOpen: payload => api.toolOpen(payload),
    toolDigest: payload => api.toolDigest(payload),
    toolContext: payload => api.toolContext(payload),
    toolRead: payload => api.toolRead(payload),
    toolSearch: payload => api.toolSearch(payload),
    toolNote: payload => api.toolNote(payload),
    toolNoteFiles: payload => api.toolNoteFiles(payload),
    noteDraftCreate: payload => api.noteDraftCreate(payload),
    memoryTool: payload => api.memoryTool(payload),
    libraryMeta: () => api.libraryMeta(),
    setBookTags: payload => api.setBookTags(payload),
    setBookStatus: payload => api.setBookStatus(payload),
    pushReaderAction: input => api.pushReaderAction(input),
    recordReaderReceipt: input => api.recordReaderReceipt(input),
    books: () => library.books(),
  }

  libraryModule.module.tools = createLibraryTools(toolApi)
  readingModule.module.tools = createReadingTools(toolApi)
  searchModule.module.tools = createSearchTools(toolApi)
  notesModule.module.tools = createNotesTools(toolApi)
  memoryModule.module.tools = createMemoryTools(toolApi)
  actionsModule.module.tools = createActionTools(toolApi)

  return {
    api,
    modules,
    router,
    mediaRoutes: modules.flatMap(module => module.mediaRoutes ?? []),
    dispose: async () => {
      await api.dispose()
    },
  }
}

export { normalizeReadingView } from '../shared/contracts/companion.ts'
export { noteFilePath } from './modules/notes/files/open.ts'

/** Convenience for tests and embedders that only need the old method surface. */
export function createReaderApi(options: CreateAppOptions): ReaderApi {
  return createApp(options).api
}
