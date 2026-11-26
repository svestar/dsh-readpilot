import type {
  LibraryMeta,
  ProgressMap,
  PromptSyncState,
  ReaderState,
  Settings,
} from '../../../shared/contracts/library.ts'
import type { CompanionSettings, SessionMap } from '../../../shared/contracts/companion.ts'
import type { ToolPromptLine } from '../tools/prompt-map.ts'
import type { Book } from './book.ts'
import { ensureWorkspacePrompt } from './workspace-prompt.ts'

export interface WorkspaceSync {
  syncPrompt(): Promise<PromptSyncState>
  syncFor(settings: Settings): Promise<PromptSyncState>
}

export function createWorkspaceSync(
  currentSettings: () => Promise<Settings>,
  toolPromptLines: () => readonly ToolPromptLine[],
): WorkspaceSync {
  async function syncFor(settings: Settings): Promise<PromptSyncState> {
    if (!settings.libraryDir) return { ok: true }
    try {
      await ensureWorkspacePrompt(settings.libraryDir, settings.workspaceLanguage ?? 'zh', toolPromptLines())
      return { ok: true }
    } catch (error) {
      // A read-only or removed library must not make the whole library page fail.
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  return {
    syncFor,
    async syncPrompt() {
      return await syncFor(await currentSettings())
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
  syncPrompt(settings: Settings): Promise<PromptSyncState>
  refreshWatch(dir: string | null): Promise<void>
}

export function createLibraryState(deps: LibraryStateDependencies): () => Promise<ReaderState> {
  return async function state(): Promise<ReaderState> {
    const settings = await deps.currentSettings()
    const promptSync = await deps.syncPrompt(settings)
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
      promptSync,
    }
  }
}
