import type { CompanionSettings } from './companion-settings.ts'
import { effectiveMemoryState } from './companion-settings.ts'
import type { Book } from './library.ts'
import { buildReadingMemory } from './memory-context.ts'
import { MemoryStoreError } from './memory-store.ts'
import type { MemoryStore } from './memory-store.ts'
import { ReaderError } from './reader-error.ts'

export interface MemoryHandlerDeps {
  resolveBook(bookId: unknown): Promise<Book>
  books(): Promise<Book[]>
  findBook(books: Book[], key: unknown): Book | undefined
  store: MemoryStore
  getSettings(): CompanionSettings
  setSettings(value: CompanionSettings): void
  loadSettings(): Promise<CompanionSettings>
  saveSettings(value: CompanionSettings): Promise<void>
  readings: Map<string, { bookId: string }>
  cache: Map<string, { text: string; characters: number; updatedAt: number }>
}

export function createMemoryHandlers({
  resolveBook,
  books,
  findBook,
  store,
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
      const book = await resolveBook(bookId)
      const [reader, card] = await Promise.all([store.readReader(), store.readBook(bookId)])
      const text = buildReadingMemory({ bookTitle: book.title, reader: reader.text, book: card.text })
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
    const [bookCard, readerCard, bookHistory, readerHistory] = await Promise.all([
      store.readBook(book.id),
      store.readReader(),
      store.listHistory(book.id),
      store.listHistory(null),
    ])
    return {
      mode: settings.memory.mode,
      book: settings.memory.books[book.id] ?? 'inherit',
      effective: effectiveMemoryState(settings, book.id),
      bookText: bookCard.text,
      readerText: readerCard.text,
      bookHistory,
      readerHistory,
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
        if (payload.scope === 'reader') {
          await store.writeReader(text)
          await rebuildAllMemory()
        } else {
          await store.writeBook(book.id, text)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'undo') {
        if (payload.scope === 'reader') {
          await store.undo(null)
          await rebuildAllMemory()
        } else {
          await store.undo(book.id)
          await rebuildMemory(book.id)
        }
        return memoryStatus(book)
      }
      if (payload.action === 'clear') {
        if (payload.scope === 'reader') {
          await store.clearReader()
          await rebuildAllMemory()
        } else {
          await store.clearBook(book.id)
          await rebuildMemory(book.id)
        }
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
    const scope = payload.scope === 'reader' ? 'reader' : 'book'
    try {
      if (payload.action === 'read') {
        const [reader, card] = await Promise.all([store.readReader(), store.readBook(found.id)])
        return {
          bookId: found.id,
          bookTitle: found.title,
          effective,
          bookCard: card.text,
          readerCard: reader.text,
        }
      }
      if (payload.action === 'forget') {
        if (effective !== 'on') throw new ReaderError('memory-off', '记忆已关闭')
        if (scope === 'reader') {
          await store.clearReader()
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
          : (await store.readBook(found.id)).text
        const preview = mode === 'append' && current.trim() ? `${current.trim()}\n\n${text}` : text
        if (scope === 'reader') {
          await store.writeReader(preview)
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
