import type {
  CompanionSessionBinding,
  CompanionSettings,
  CompanionReadingView,
  SessionBookResult,
} from '../../../shared/contracts/companion.ts'
import { normalizeReadingView } from '../../../shared/contracts/companion.ts'
import type { ProgressMap, Settings, WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import type { HostContext } from '../../types.ts'
import { ReaderError } from '../../lib/errors.ts'
import { enqueueWrite } from '../../lib/write-queue.ts'
import { buildCompanionContext, buildReaderGuard } from './context.ts'
import { createCompanionSessionList } from './session-list.ts'
import { loadSessions, saveSessions } from './session-store.ts'

export interface CompanionServiceOptions {
  dataDir: string
  ctx?: HostContext
  books(): Promise<Book[]>
  progress(): Promise<ProgressMap>
  librarySettings(): Promise<Settings>
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  notes: { enabled(bookId: string): boolean; rebuild(bookId: string): Promise<number> }
  memory: { enabled(bookId: string): boolean; rebuild(bookId: string): Promise<number> }
  recentActions(bookId: string): Array<{ summary: string; status: string }>
  readings: Map<string, { bookId: string; title: string; chapter: string; view?: CompanionReadingView; updatedAt: number }>
  contexts: Map<string, { text: string; updatedAt: number; language: WorkspaceLanguage }>
}

export function createCompanionService(options: CompanionServiceOptions) {
  const readOnlySessions = new Set<string>()
  const sessionList = createCompanionSessionList({
    dataDir: options.dataDir,
    ctx: options.ctx,
    books: options.books,
    librarySettings: options.librarySettings,
  })

  function archivedSessionIds(): string[] {
    const registry = options.ctx?.get('workspaceRegistry') as { archivedSessionIds?: unknown } | undefined
    const ids = registry?.archivedSessionIds
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  }

  async function setCompanionSession({ bookId, sessionId }: any = {}): Promise<CompanionSessionBinding> {
    if (typeof bookId !== 'string' || !bookId) {
      throw new ReaderError('invalid-session', '缺少书籍 ID')
    }
    if (sessionId != null && typeof sessionId !== 'string') {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const unboundBookIds: string[] = []
    await enqueueWrite(`sessions:${options.dataDir}`, async () => {
      const sessions = await loadSessions(options.dataDir)
      if (sessionId) {
        // A conversation belongs to one book at a time; moving it keeps the
        // reading context from being shared under two different books.
        for (const [otherBookId, entry] of Object.entries(sessions)) {
          if (otherBookId === bookId || entry.sessionId !== sessionId) continue
          delete sessions[otherBookId]
          unboundBookIds.push(otherBookId)
        }
        sessions[bookId] = { sessionId, updatedAt: Date.now() }
      } else {
        delete sessions[bookId]
      }
      await saveSessions(options.dataDir, sessions)
    })
    return { bookId, sessionId: sessionId ?? null, unboundBookIds: unboundBookIds.sort() }
  }

  async function sessionAlive({ sessionId }: { sessionId?: unknown } = {}): Promise<{ sessionId: string; alive: boolean }> {
    if (typeof sessionId !== 'string' || !sessionId) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    return { sessionId, alive: !archivedSessionIds().includes(sessionId) }
  }

  async function sessionBook({ sessionId }: { sessionId?: unknown } = {}): Promise<SessionBookResult | null> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) return null
    if (archivedSessionIds().includes(sessionId)) return null
    const [sessions, books, progress] = await Promise.all([
      loadSessions(options.dataDir),
      options.books(),
      options.progress(),
    ])
    let latest: { bookId: string; updatedAt: number } | null = null
    for (const [bookId, entry] of Object.entries(sessions)) {
      if (entry.sessionId !== sessionId) continue
      if (!latest || entry.updatedAt > latest.updatedAt) latest = { bookId, updatedAt: entry.updatedAt }
    }
    if (!latest) return null
    const book = books.find(candidate => candidate.id === latest!.bookId)
    if (!book) return null
    return {
      bookId: book.id,
      title: book.title,
      format: book.format,
      progress: progress[book.id] ?? null,
    }
  }

  async function setCompanionPolicy({ sessionId }: { sessionId?: unknown } = {}): Promise<{ sessionId: string; mode: string | null; applied: boolean }> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const sessions = options.ctx?.get('sessions')
    const session = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
    if (!session || typeof session.append !== 'function') {
      return { sessionId, mode: null, applied: false }
    }
    if (readOnlySessions.has(sessionId)) {
      return { sessionId, mode: 'read-only', applied: false }
    }
    // Prefer the permission preset so sandbox and approval stay in sync. A raw
    // sandbox override can leave approval at `never`, which DSH reports as
    // "custom" instead of "read-only".
    const presets = options.ctx?.get('permissionPresets')
    if (presets && typeof presets.set === 'function') {
      try {
        presets.set(session, 'read-only')
        readOnlySessions.add(sessionId)
        return { sessionId, mode: 'read-only', applied: true }
      } catch {
        // Older hosts without the read-only preset fall back to the raw event.
      }
    }
    const policy = options.ctx?.get('sandboxPolicy')
    const current = policy && typeof policy.overrideOf === 'function' ? policy.overrideOf(session) : undefined
    if (current === 'read-only') {
      readOnlySessions.add(sessionId)
      return { sessionId, mode: 'read-only', applied: false }
    }
    session.append('sandbox/mode', { mode: 'read-only' })
    readOnlySessions.add(sessionId)
    return { sessionId, mode: 'read-only', applied: true }
  }

  function recentActionsOf(bookId: string): Array<{ summary: string; status: string }> {
    return options.recentActions(bookId).slice(0, 5)
  }

  async function setCompanionContext({ sessionId, bookId, title, chapter, view }: any = {}): Promise<{ sessionId: string; characters: number }> {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) {
      throw new ReaderError('invalid-session', '会话 ID 必须是字符串')
    }
    const book = typeof bookId === 'string' ? bookId.slice(0, 128) : ''
    const bookTitle = typeof title === 'string' ? title.slice(0, 300) : ''
    const chapterTitle = typeof chapter === 'string' ? chapter.slice(0, 300) : ''
    const language = (await options.librarySettings()).workspaceLanguage ?? 'zh'
    const previous = options.readings.get(sessionId)
    const normalizedView = normalizeReadingView(view)
    const effectiveView = normalizedView ?? previous?.view
    const text = buildCompanionContext({
      bookId: book,
      bookTitle,
      chapterTitle,
      view: effectiveView,
      language,
      recentActions: book ? recentActionsOf(book) : [],
    })
    options.contexts.set(sessionId, { text, updatedAt: Date.now(), language })
    if (options.contexts.size > 200) {
      const oldest = [...options.contexts.entries()]
        .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
      for (const [id] of oldest.slice(0, options.contexts.size - 200)) options.contexts.delete(id)
    }
    if (book) {
      const bookChanged = previous?.bookId !== book
      options.readings.set(sessionId, {
        bookId: book,
        title: bookTitle,
        chapter: chapterTitle,
        ...(effectiveView ? { view: effectiveView } : {}),
        updatedAt: Date.now(),
      })
      if (options.readings.size > 200) {
        const oldest = [...options.readings.entries()]
          .sort((left, right) => left[1].updatedAt - right[1].updatedAt)
        for (const [id] of oldest.slice(0, options.readings.size - 200)) options.readings.delete(id)
      }
      if (bookChanged && options.notes.enabled(book)) void options.notes.rebuild(book)
      if (bookChanged && options.memory.enabled(book)) void options.memory.rebuild(book)
    }
    return { sessionId, characters: text.length }
  }

  async function ensureSessionReading(sessionId: string): Promise<{ bookId: string; title: string; chapter: string; view?: CompanionReadingView } | undefined> {
    const existing = options.readings.get(sessionId)
    if (existing) return existing
    const [sessions, books, progress] = await Promise.all([
      loadSessions(options.dataDir),
      options.books(),
      options.progress(),
    ])
    const entries = Object.entries(sessions)
      .filter(([, entry]) => entry.sessionId === sessionId)
      .sort((left, right) => (left[1].updatedAt ?? 0) - (right[1].updatedAt ?? 0))
    const latest = entries.at(-1)
    if (!latest) return undefined
    const [bookId, entry] = latest
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) return undefined
    await setCompanionContext({
      sessionId: entry.sessionId,
      bookId: book.id,
      title: book.title,
      chapter: progress[book.id]?.chapterTitle ?? '',
    })
    return options.readings.get(sessionId)
  }

  async function syncCompanionContexts(): Promise<void> {
    const [sessions, books, progress, companion] = await Promise.all([
      loadSessions(options.dataDir),
      options.books(),
      options.progress(),
      options.loadSettings(),
    ])
    options.setSettings(companion)
    const bookById = new Map(books.map(book => [book.id, book]))
    const entries = Object.entries(sessions).sort((left, right) => (left[1].updatedAt ?? 0) - (right[1].updatedAt ?? 0))
    for (const [bookId, entry] of entries) {
      if (options.readings.has(entry.sessionId)) continue
      const book = bookById.get(bookId)
      if (!book) continue
      await setCompanionContext({
        sessionId: entry.sessionId,
        bookId: book.id,
        title: book.title,
        chapter: progress[book.id]?.chapterTitle ?? '',
      })
    }
  }

  function companionContextOf(sessionId: unknown): string {
    return typeof sessionId === 'string' ? options.contexts.get(sessionId)?.text ?? '' : ''
  }

  function readerGuardOf(sessionId: unknown): string {
    const language = typeof sessionId === 'string' ? options.contexts.get(sessionId)?.language : undefined
    return buildReaderGuard(language ?? 'en')
  }

  async function refreshCompanionContexts(bookId: string): Promise<void> {
    for (const [sessionId, reading] of options.readings) {
      if (reading.bookId !== bookId) continue
      try {
        await setCompanionContext({
          sessionId,
          bookId: reading.bookId,
          title: reading.title,
          chapter: reading.chapter,
          ...(reading.view ? { view: reading.view } : {}),
        })
      } catch {
        // A stale session must not block the undo.
      }
    }
  }

  return {
    setCompanionSession,
    listCompanionSessions: sessionList.listCompanionSessions,
    sessionAlive,
    sessionBook,
    setCompanionPolicy,
    setCompanionContext,
    ensureSessionReading,
    syncCompanionContexts,
    companionContextOf,
    readerGuardOf,
    refreshCompanionContexts,
  }
}
