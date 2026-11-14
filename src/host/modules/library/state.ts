import type {
  LibraryMeta,
  ProgressMap,
  ReaderState,
  Settings,
} from '../../../shared/contracts/library.ts'
import type { CompanionSettings, SessionMap } from '../../../shared/contracts/companion.ts'
import type { Book } from './book.ts'
import { ensureWorkspacePrompt } from './workspace-prompt.ts'

export interface WorkspaceSync {
  syncPrompt(): Promise<void>
  syncFor(settings: Settings): Promise<void>
}

export function createWorkspaceSync(currentSettings: () => Promise<Settings>): WorkspaceSync {
  let promptDir: string | null = null

  async function syncFor(settings: Settings): Promise<void> {
    if (!settings.libraryDir || promptDir === settings.libraryDir) return
    try {
      await ensureWorkspacePrompt(settings.libraryDir)
      promptDir = settings.libraryDir
    } catch {
      // A read-only or removed library must not make the whole library page fail.
    }
  }

  return {
    syncFor,
    async syncPrompt() {
      await syncFor(await currentSettings())
    },
  }
}

export interface LibraryStateDependencies {
  currentSettings(): Promise<Settings>
  books(options?: { fresh?: boolean }): Promise<Book[]>
  progress(): Promise<ProgressMap>
  sessions(): Promise<SessionMap>
  meta(): Promise<LibraryMeta>
  companion(): Promise<CompanionSettings>
  archivedSessionIds(): string[]
  syncPrompt(settings: Settings): Promise<void>
  refreshWatch(dir: string | null): Promise<void>
}

export function createLibraryState(deps: LibraryStateDependencies): () => Promise<ReaderState> {
  return async function state(): Promise<ReaderState> {
    const settings = await deps.currentSettings()
    await deps.syncPrompt(settings)
    await deps.refreshWatch(settings.libraryDir || null)
    const [books, progress, sessions, meta, companion] = await Promise.all([
      deps.books(),
      deps.progress(),
      deps.sessions(),
      deps.meta(),
      deps.companion(),
    ])
    const archived = new Set(deps.archivedSessionIds())
    if (archived.size > 0) {
      for (const [bookId, entry] of Object.entries(sessions)) {
        if (archived.has(entry.sessionId)) delete sessions[bookId]
      }
    }
    return {
      settings,
      books: books.map(book => ({ ...book, progress: progress[book.id] ?? null })),
      progress,
      sessions,
      tags: meta.tags,
      status: meta.status,
      rating: meta.rating,
      companion,
    }
  }
}
