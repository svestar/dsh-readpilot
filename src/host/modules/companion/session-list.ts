import type {
  CompanionSessionList,
  CompanionSessionSummary,
} from '../../../shared/contracts/companion.ts'
import type { Settings } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import type { HostContext } from '../../types.ts'
import { ReaderError } from '../../lib/errors.ts'
import { loadSessions } from './session-store.ts'

export interface CompanionSessionListOptions {
  dataDir: string
  ctx?: HostContext
  books(): Promise<Book[]>
  librarySettings(): Promise<Settings>
}

/** Conversations the reading UI may bind for one book, with their current book. */
export function createCompanionSessionList(options: CompanionSessionListOptions) {
  async function listCompanionSessions({ bookId }: any = {}): Promise<CompanionSessionList> {
    if (typeof bookId !== 'string' || !bookId) {
      throw new ReaderError('invalid-session', '缺少书籍 ID')
    }
    const [books, sessionMap, settings] = await Promise.all([
      options.books(),
      loadSessions(options.dataDir),
      options.librarySettings(),
    ])
    const currentSessionId = sessionMap[bookId]?.sessionId ?? null
    const bookById = new Map(books.map(book => [book.id, book]))

    // A session may have legacy duplicate bindings; the newest one wins.
    const boundBySession = new Map<string, { bookId: string; updatedAt: number }>()
    for (const [boundBookId, entry] of Object.entries(sessionMap)) {
      if (!entry.sessionId) continue
      const previous = boundBySession.get(entry.sessionId)
      if (!previous || entry.updatedAt >= previous.updatedAt) {
        boundBySession.set(entry.sessionId, { bookId: boundBookId, updatedAt: entry.updatedAt })
      }
    }

    const registry = options.ctx?.get('workspaceRegistry') as any
    const archived = new Set<string>(Array.isArray(registry?.archivedSessionIds) ? registry.archivedSessionIds : [])
    const workspace = settings.workspaceId && typeof registry?.get === 'function'
      ? registry.get(settings.workspaceId)
      : undefined
    const allowed = new Set<string>(Array.isArray(workspace?.sessionIds) ? workspace.sessionIds : [])

    const query = options.ctx?.get('sessionQuery') as any
    let records: any[] = []
    if (query && typeof query.listSessions === 'function') {
      try {
        records = await query.listSessions()
      } catch {
        records = []
      }
    }
    records = records.filter(record => {
      const header = record?.header
      if (!header || typeof header.id !== 'string') return false
      if (archived.has(header.id)) return false
      if (header.origin === 'subagent' || header.parentSession) return false
      if (allowed.size > 0) return allowed.has(header.id)
      return Boolean(settings.libraryDir) && header.cwd === settings.libraryDir
    })

    const titleById = new Map<string, { title: string; updatedAt: number }>()
    if (query && records.length > 0) {
      if (typeof query.readTitleSnapshots === 'function') {
        try {
          const observations = await query.readTitleSnapshots(records.map(record => record.header.id))
          for (const observation of observations ?? []) {
            if (observation?.status !== 'fulfilled') continue
            const title = observation.value?.title
            if (!title || typeof title.title !== 'string' || !title.title.trim()) continue
            titleById.set(observation.sessionId, {
              title: title.title,
              updatedAt: Number(title.updatedAt) || Number(observation.value?.session?.createdAt) || 0,
            })
          }
        } catch {
          // The picker still opens with the current binding when titles fail.
        }
      } else if (typeof query.readTitle === 'function') {
        for (const record of records) {
          try {
            const title = await query.readTitle(record.header.id)
            if (title && typeof title.title === 'string' && title.title.trim()) {
              titleById.set(record.header.id, { title: title.title, updatedAt: Number(title.updatedAt) || 0 })
            }
          } catch {
            // Skip a single unreadable session.
          }
        }
      }
    }

    const sessions: CompanionSessionSummary[] = []
    for (const record of records) {
      const sessionId = record.header.id as string
      const title = titleById.get(sessionId)
      // Untitled sessions are blanks; only the current binding stays visible.
      if (!title && sessionId !== currentSessionId) continue
      const binding = boundBySession.get(sessionId)
      const boundBook = binding ? bookById.get(binding.bookId) : undefined
      sessions.push({
        sessionId,
        title: title?.title ?? '',
        updatedAt: title?.updatedAt || Number(record.header.createdAt) || 0,
        boundBookId: binding?.bookId ?? null,
        boundBookTitle: boundBook?.title ?? null,
      })
    }
    sessions.sort((left, right) => right.updatedAt - left.updatedAt)

    if (currentSessionId && !sessions.some(session => session.sessionId === currentSessionId)) {
      const currentBook = bookById.get(bookId)
      sessions.unshift({
        sessionId: currentSessionId,
        title: '',
        updatedAt: sessionMap[bookId]?.updatedAt ?? 0,
        boundBookId: bookId,
        boundBookTitle: currentBook?.title ?? null,
      })
    }
    return { currentSessionId, sessions: sessions.slice(0, 50) }
  }

  return { listCompanionSessions }
}
