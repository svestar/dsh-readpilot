import type { CompanionSettings } from '../../../shared/contracts/companion.ts'
import { effectiveMemoryState } from '../../../shared/contracts/companion.ts'
import type { Settings } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { buildReadingMemory } from './context.ts'
import { MemoryStoreError } from './store.ts'
import type { MemoryStore } from './store.ts'
import { ReaderError } from '../../lib/errors.ts'

export interface MemoryHandlerDeps {
  resolveBook(bookId: unknown): Promise<Book>
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  store: MemoryStore
  librarySettings(): Promise<Settings>
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
  cache: Map<string, { text: string; characters: number; updatedAt: number }>
}

function memoryScope(value: unknown): 'book' | 'reader' | 'role' {
  return value === 'reader' ? 'reader' : value === 'role' ? 'role' : 'book'
}

export function createMemoryHandlers({
  resolveBook,
  books,
  findBook,
  store,
  librarySettings,
  getSettings,
  setSettings,
  loadSettings,
  saveSettings,
  readings,
  cache,
}: MemoryHandlerDeps) {
  async function rebuildMemory(bookId: string): Promise<number> {
    try {
      if (effectiveMemoryState(getSettings(), bookId) !== 'on') {
        cache.delete(bookId)
        return 0
      }
      const [book, settings] = await Promise.all([resolveBook(bookId), librarySettings()])
      const [reader, role, card] = await Promise.all([store.readReader(), store.readRole(), store.readBook(bookId)])
      const text = buildReadingMemory({
        bookTitle: book.title,
        reader: reader.text,
        role: role.text,
        book: card.text,
        language: settings.workspaceLanguage ?? 'zh',
      })
      cache.set(bookId, { text, characters: text.length, updatedAt: Date.now() })
      return text.length
    } catch {
      cache.delete(bookId)
      return 0
    }
  }

  async function rebuildAllMemory(): Promise<void> {
    const bookIds = new Set<string>()
    for (const reading of readings.values()) bookIds.add(reading.bookId)
    await Promise.all([...bookIds].map(bookId => rebuildMemory(bookId)))
  }

  async function memoryStatus(book: Book): Promise<any> {
    const settings = getSettings()
    const [bookCard, readerCard, roleCard, bookHistory, readerHistory, roleHistory] = await Promise.all([
      store.readBook(book.id),
      store.readReader(),
      store.readRole(),
      store.listHistory(book.id),
      store.listHistory(null),
      store.listHistory('role'),
    ])
    return {
      mode: settings.memory.mode,
      book: settings.memory.books[book.id] ?? 'inherit',
      effective: effectiveMemoryState(settings, book.id),
      bookText: bookCard.text,
      readerText: readerCard.text,
      roleText: roleCard.text,
      bookHistory,
      readerHistory,
      roleHistory,
    }
  }

  async function memory(payload: any = {}): Promise<any> {
    const book = await resolveBook(payload.bookId)
    setSettings(await loadSettings())
    const settings = () => getSettings()
    try {
      if (payload.action === 'setMode') {
        const mode = payload.mode
        if (mode !== 'off' && mode !== 'on') {
          throw new ReaderError('invalid-memory', '记忆模式必须是 off 或 on')
        }
        const next = { ...settings(), memory: { ...settings().memory, mode } }
        setSettings(next)
        await saveSettings(next)
        await rebuildAllMemory()
        return memoryStatus(book)
      }
      if (payload.action === 'setBook') {
        const state = payload.state
        if (state !== 'inherit' && state !== 'on' && state !== 'off') {
          throw new ReaderError('invalid-memory', '单书状态必须是 inherit、on 或 off')
        }
        const booksById = { ...settings().memory.books }
        if (state === 'inherit') delete booksById[book.id]
        else booksById[book.id] = state
        const next = { ...settings(), memory: { ...settings().memory, books: booksById } }
        setSettings(next)
        await saveSettings(next)
        await rebuildMemory(book.id)
        return memoryStatus(book)
      }
      if (payload.action === 'write') {
        const text = typeof payload.text === 'string' ? payload.text : ''
        const scope = memoryScope(payload.scope)
        if (scope === 'reader') {
          await store.writeReader(text)
          await rebuildAllMemory()
        } else if (scope === 'role') {
          await store.writeRole(text)
          await rebuildAllMemory()
        } else {
          await store.writeBook(book.id, text)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'undo') {
        const scope = memoryScope(payload.scope)
        if (scope === 'reader') {
          await store.undo(null)
          await rebuildAllMemory()
        } else if (scope === 'role') {
          await store.undo('role')
          await rebuildAllMemory()
        } else {
          await store.undo(book.id)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'clear') {
        const scope = memoryScope(payload.scope)
        if (scope === 'reader') {
          await store.clearReader()
          await rebuildAllMemory()
        } else if (scope === 'role') {
          await store.clearRole()
          await rebuildAllMemory()
        } else {
          await store.clearBook(book.id)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'historyRestore' || payload.action === 'historyRemove' || payload.action === 'historyClear') {
        const scope = memoryScope(payload.scope)
        const cardId = scope === 'reader' ? null : scope === 'role' ? 'role' : book.id
        if (payload.action === 'historyRestore') {
          await store.restoreHistory(cardId, String(payload.id ?? ''))
        } else if (payload.action === 'historyRemove') {
          await store.removeHistory(cardId, String(payload.id ?? ''))
        } else {
          await store.clearHistory(cardId)
        }
        if (scope === 'book') await rebuildMemory(book.id)
        else await rebuildAllMemory()
        return memoryStatus(book)
      }
      if (payload.action === 'status' || payload.action === undefined) return memoryStatus(book)
      throw new ReaderError('invalid-memory-action', `未知记忆操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof MemoryStoreError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  async function memoryTool(payload: any = {}): Promise<any> {
    const list = await books()
    const found = findBook(list, payload.book)
    if (!found) throw new ReaderError('book-not-found', `书库中找不到书籍：${String(payload.book)}`)
    setSettings(await loadSettings())
    const effective = effectiveMemoryState(getSettings(), found.id)
    const scope = memoryScope(payload.scope)
    try {
      if (payload.action === 'read') {
        const [reader, role, card] = await Promise.all([store.readReader(), store.readRole(), store.readBook(found.id)])
        return {
          bookId: found.id,
          bookTitle: found.title,
          effective,
          bookCard: card.text,
          readerCard: reader.text,
          roleCard: role.text,
        }
      }
      if (payload.action === 'forget') {
        if (effective !== 'on') throw new ReaderError('memory-off', '记忆已关闭')
        if (scope === 'reader') {
          await store.clearReader()
          await rebuildAllMemory()
        } else if (scope === 'role') {
          await store.clearRole()
          await rebuildAllMemory()
        } else {
          await store.clearBook(found.id)
          await rebuildMemory(found.id)
        }
        return { forgotten: true, scope }
      }
      if (payload.action === 'update') {
        if (effective !== 'on') throw new ReaderError('memory-off', '记忆已关闭')
        const text = typeof payload.text === 'string' ? payload.text.trim() : ''
        if (!text) throw new ReaderError('invalid-memory', '记忆内容不能为空')
        const mode = payload.mode === 'replace' ? 'replace' : 'append'
        const current = scope === 'reader'
          ? (await store.readReader()).text
          : scope === 'role'
            ? (await store.readRole()).text
            : (await store.readBook(found.id)).text
        const preview = mode === 'append' && current.trim() ? `${current.trim()}\n\n${text}` : text
        if (scope === 'reader') {
          await store.writeReader(preview)
          await rebuildAllMemory()
        } else if (scope === 'role') {
          await store.writeRole(preview)
          await rebuildAllMemory()
        } else {
          await store.writeBook(found.id, preview)
          await rebuildMemory(found.id)
        }
        return { saved: true, scope, characters: preview.length }
      }
      throw new ReaderError('invalid-memory-action', `未知记忆操作：${String(payload.action)}`)
    } catch (error) {
      if (error instanceof MemoryStoreError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  function memoryContextFor(sessionId: unknown): string {
    if (typeof sessionId !== 'string' || !sessionId) return ''
    const reading = readings.get(sessionId)
    if (!reading) return ''
    if (effectiveMemoryState(getSettings(), reading.bookId) !== 'on') return ''
    return cache.get(reading.bookId)?.text ?? ''
  }

  return { rebuildMemory, rebuildAllMemory, memoryStatus, memory, memoryTool, memoryContextFor }
}
