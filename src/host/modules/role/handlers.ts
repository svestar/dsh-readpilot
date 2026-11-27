import type { CompanionSettings } from '../../../shared/contracts/companion.ts'
import type { RoleScope, RoleState } from '../../../shared/contracts/role.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'
import { CardStoreError } from '../../lib/card-store.ts'
import { buildRoleContext } from './context.ts'
import { defaultRoleText } from './defaults.ts'
import { resolveRole } from './resolve.ts'
import type { RoleStore } from './store.ts'

export interface RoleHandlerDeps {
  resolveBook(bookId: unknown): Promise<Book>
  store: RoleStore
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
  workspaceLanguage(): WorkspaceLanguage
}

function roleScope(value: unknown): RoleScope {
  return value === 'global' ? 'global' : 'book'
}

export function createRoleHandlers({
  resolveBook,
  store,
  getSettings,
  setSettings,
  loadSettings,
  saveSettings,
  readings,
  workspaceLanguage,
}: RoleHandlerDeps) {
  let globalText = ''
  let bookTexts = new Map<string, string>()

  async function refresh(): Promise<void> {
    const [all, settings] = await Promise.all([store.readAll(), loadSettings()])
    setSettings(settings)
    globalText = all.global.text
    bookTexts = new Map(Object.entries(all.books).map(([bookId, card]) => [bookId, card.text]))
  }

  async function roleStatus(book: Book): Promise<RoleState> {
    const settings = getSettings()
    const [global, card, globalHistory, bookHistory] = await Promise.all([
      store.read('global'),
      store.read('book', book.id),
      store.listHistory('global'),
      store.listHistory('book', book.id),
    ])
    const language = workspaceLanguage()
    const resolved = resolveRole({
      enabled: settings.roles.enabled,
      bookEnabled: settings.roles.books[book.id] === true,
      globalText: global.text,
      bookText: card.text,
      language,
    })
    return {
      enabled: settings.roles.enabled,
      bookEnabled: settings.roles.books[book.id] === true,
      bookId: book.id,
      globalText: global.text,
      bookText: card.text,
      defaultText: defaultRoleText(language),
      effectiveText: resolved.text,
      effectiveSource: resolved.source,
      globalHistory,
      bookHistory,
    }
  }

  async function role(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    setSettings(await loadSettings())
    try {
      if (payload.action === 'status' || payload.action === undefined) {
        await refresh()
        return roleStatus(book)
      }
      if (payload.action === 'setEnabled') {
        if (typeof payload.enabled !== 'boolean') throw new ReaderError('invalid-role', 'enabled 必须是布尔值')
        const next = { ...getSettings(), roles: { ...getSettings().roles, enabled: payload.enabled } }
        setSettings(next)
        await saveSettings(next)
        return roleStatus(book)
      }
      if (payload.action === 'setBookEnabled') {
        if (typeof payload.enabled !== 'boolean') throw new ReaderError('invalid-role', 'enabled 必须是布尔值')
        const books = { ...getSettings().roles.books }
        if (payload.enabled) books[book.id] = true
        else delete books[book.id]
        const next = { ...getSettings(), roles: { ...getSettings().roles, books } }
        setSettings(next)
        await saveSettings(next)
        return roleStatus(book)
      }
      if (payload.action === 'write') {
        const scope = roleScope(payload.scope)
        await store.write(scope, typeof payload.text === 'string' ? payload.text : '', scope === 'book' ? book.id : undefined)
        await refresh()
        return roleStatus(book)
      }
      if (payload.action === 'clear') {
        const scope = roleScope(payload.scope)
        await store.clear(scope, scope === 'book' ? book.id : undefined)
        await refresh()
        return roleStatus(book)
      }
      if (payload.action === 'undo') {
        const scope = roleScope(payload.scope)
        await store.undo(scope, scope === 'book' ? book.id : undefined)
        await refresh()
        return roleStatus(book)
      }
      if (payload.action === 'historyRestore') {
        const scope = roleScope(payload.scope)
        await store.restoreHistory(scope, String(payload.id ?? ''), scope === 'book' ? book.id : undefined)
        await refresh()
        return roleStatus(book)
      }
      if (payload.action === 'historyRemove') {
        const scope = roleScope(payload.scope)
        await store.removeHistory(scope, String(payload.id ?? ''), scope === 'book' ? book.id : undefined)
        return roleStatus(book)
      }
      if (payload.action === 'historyClear') {
        const scope = roleScope(payload.scope)
        await store.clearHistory(scope, scope === 'book' ? book.id : undefined)
        return roleStatus(book)
      }
      throw new ReaderError('invalid-role-action', `未知角色操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof CardStoreError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  function roleContextFor(sessionId: unknown): string {
    const bookId = typeof sessionId === 'string' ? readings.get(sessionId)?.bookId : undefined
    if (!bookId) return ''
    const settings = getSettings()
    const language = workspaceLanguage()
    const resolved = resolveRole({
      enabled: settings.roles.enabled,
      bookEnabled: settings.roles.books[bookId] === true,
      globalText,
      bookText: bookTexts.get(bookId) ?? '',
      language,
    })
    return buildRoleContext({ ...resolved, language })
  }

  return { role, roleContextFor, refresh }
}
