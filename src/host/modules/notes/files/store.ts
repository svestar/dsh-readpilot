import { randomBytes } from 'node:crypto'
import { readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  NoteBookRef,
  NoteFileContent,
  NoteFileKind,
  NoteFileRecord,
  NoteHistoryEntry,
} from '../../../../shared/contracts/notes.ts'
import { createNoteHistory } from './history.ts'
import {
  BOOK_NOTE_FILE,
  MAX_HISTORY,
  META_CACHE_LIMIT,
  NoteFileError,
  assertBookId,
  assertInside,
  atomicWrite,
  bodyOf,
  ensureBookDir,
  exists,
  findBookDir,
  hashOf,
  parseFrontMatter,
  recordOf,
  sanitizeTitle,
  serializeNote,
  slugify,
  uniqueFileName,
} from './paths.ts'

export interface NoteFileStore {
  list(book: NoteBookRef): Promise<NoteFileRecord[]>
  read(book: NoteBookRef, id: string): Promise<NoteFileContent>
  create(book: NoteBookRef, input: { title?: unknown; kind?: unknown; body?: unknown }): Promise<NoteFileContent>
  write(book: NoteBookRef, id: string, input: { title?: unknown; body?: unknown; baseHash?: unknown }): Promise<NoteFileContent>
  remove(book: NoteBookRef, id: string): Promise<boolean>
  restore(book: NoteBookRef, record: NoteFileRecord, body: string): Promise<NoteFileContent>
  listHistory(book: NoteBookRef, noteId: string): Promise<NoteHistoryEntry[]>
  readHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<{ id: string; body: string; content: string; createdAt: number; characters: number }>
  restoreHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<NoteFileContent>
  removeHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<boolean>
  clearHistory(book: NoteBookRef, noteId: string): Promise<number>
}

export interface NoteFileStoreOptions {
  maxHistory?: number
}

export function createNoteFileStore(root: string, options: NoteFileStoreOptions = {}): NoteFileStore {
  const maxHistory = options.maxHistory ?? MAX_HISTORY
  const metaCache = new Map<string, { mtimeMs: number; size: number; note: NoteFileRecord }>()

  function forgetMeta(path: string): void {
    metaCache.delete(path)
  }

  async function noteRecordOf(dir: string, fileName: string, book: NoteBookRef): Promise<NoteFileRecord | null> {
    const path = join(dir, fileName)
    assertInside(dir, path)
    let info
    try {
      info = await stat(path)
    } catch {
      forgetMeta(path)
      return null
    }
    const cached = metaCache.get(path)
    if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) return cached.note
    const parsed = await recordOf(dir, fileName, book)
    if (!parsed) {
      forgetMeta(path)
      return null
    }
    metaCache.set(path, { mtimeMs: info.mtimeMs, size: info.size, note: parsed.note })
    if (metaCache.size > META_CACHE_LIMIT) {
      const oldest = metaCache.keys().next().value
      if (oldest !== undefined) metaCache.delete(oldest)
    }
    return parsed.note
  }

  async function list(book: NoteBookRef): Promise<NoteFileRecord[]> {
    assertBookId(book.id)
    const dir = await findBookDir(root, book.id)
    if (!dir) return []
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const notes: NoteFileRecord[] = []
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.') || !entry.name.endsWith('.md')) continue
      const note = await noteRecordOf(dir, entry.name, book)
      if (note) notes.push(note)
    }
    return notes.sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === 'book' ? -1 : 1
      return right.updatedAt - left.updatedAt
    })
  }

  async function requireNote(book: NoteBookRef, id: string): Promise<{ dir: string; note: NoteFileRecord }> {
    assertBookId(book.id)
    const dir = await findBookDir(root, book.id)
    if (!dir) throw new NoteFileError('note-not-found', '笔记不存在')
    for (const note of await list(book)) {
      if (note.id === id) return { dir, note }
    }
    throw new NoteFileError('note-not-found', '笔记不存在')
  }

  async function read(book: NoteBookRef, id: string): Promise<NoteFileContent> {
    assertBookId(book.id)
    const dir = await findBookDir(root, book.id)
    if (!dir) throw new NoteFileError('note-not-found', '笔记不存在')
    for (const note of await list(book)) {
      if (note.id !== id) continue
      const parsed = await recordOf(dir, note.fileName, book)
      if (!parsed) break
      return { note: parsed.note, body: parsed.body, hash: parsed.note.hash }
    }
    throw new NoteFileError('note-not-found', '笔记不存在')
  }

  async function create(book: NoteBookRef, input: { title?: unknown; kind?: unknown; body?: unknown }): Promise<NoteFileContent> {
    const bookId = assertBookId(book.id)
    const kind: NoteFileKind = input.kind === 'book' ? 'book' : 'topic'
    const title = sanitizeTitle(input.title, kind === 'book' ? '整书笔记' : '未命名')
    const dir = await ensureBookDir(root, book)
    const fileName = kind === 'book' ? BOOK_NOTE_FILE : await uniqueFileName(dir, slugify(title))
    const path = join(dir, fileName)
    assertInside(dir, path)
    if (await exists(path)) {
      throw new NoteFileError('note-exists', kind === 'book' ? '整书笔记已存在' : '同名笔记已存在')
    }
    const id = kind === 'book' ? 'book' : `note-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
    const stamp = Date.now()
    const raw = serializeNote({
      id,
      kind,
      title,
      bookId,
      created: stamp,
      updated: stamp,
    }, bodyOf(input.body ?? `# ${title}\n`))
    await atomicWrite(path, raw)
    forgetMeta(path)
    return read(book, id)
  }

  async function write(book: NoteBookRef, id: string, input: { title?: unknown; body?: unknown; baseHash?: unknown }): Promise<NoteFileContent> {
    assertBookId(book.id)
    const dir = await findBookDir(root, book.id)
    if (!dir) throw new NoteFileError('note-not-found', '笔记不存在')
    const current = (await list(book)).find(note => note.id === id) ?? null
    if (!current) throw new NoteFileError('note-not-found', '笔记不存在')
    const path = join(dir, current.fileName)
    assertInside(dir, path)
    const raw = await readFile(path, 'utf8')
    const currentHash = hashOf(raw)
    if (typeof input.baseHash === 'string' && input.baseHash && input.baseHash !== currentHash) {
      throw new NoteFileError('note-conflict', '笔记已被其他编辑修改')
    }
    const parsed = parseFrontMatter(raw)
    const title = sanitizeTitle(input.title ?? parsed.meta.title, current.title)
    const kind: NoteFileKind = current.kind
    let fileName = current.fileName
    if (kind !== 'book' && slugify(title) !== slugify(current.title)) {
      fileName = await uniqueFileName(dir, slugify(title), current.fileName)
    }
    const stamp = Date.now()
    const content = serializeNote({
      id: current.id,
      kind,
      title,
      bookId: book.id,
      created: current.createdAt,
      updated: stamp,
    }, bodyOf(input.body ?? parsed.body))
    await history.writeHistory(dir, current.id, raw, maxHistory)
    if (fileName !== current.fileName) {
      const next = join(dir, fileName)
      assertInside(dir, next)
      await rename(path, next)
      forgetMeta(path)
    }
    const target = join(dir, fileName)
    await atomicWrite(target, content)
    forgetMeta(target)
    return read(book, current.id)
  }

  async function remove(book: NoteBookRef, id: string): Promise<boolean> {
    assertBookId(book.id)
    const dir = await findBookDir(root, book.id)
    if (!dir) return false
    const note = (await list(book)).find(item => item.id === id)
    if (!note) return false
    const path = join(dir, note.fileName)
    assertInside(dir, path)
    await rm(path, { force: true })
    forgetMeta(path)
    return true
  }

  async function restore(book: NoteBookRef, record: NoteFileRecord, body: string): Promise<NoteFileContent> {
    const bookId = assertBookId(book.id)
    const dir = await ensureBookDir(root, book)
    const path = join(dir, record.fileName)
    assertInside(dir, path)
    const raw = serializeNote({
      id: record.id,
      kind: record.kind,
      title: record.title,
      bookId,
      created: record.createdAt,
      updated: record.updatedAt,
    }, bodyOf(body))
    await atomicWrite(path, raw)
    forgetMeta(path)
    return read(book, record.id)
  }

  const history = createNoteHistory({ maxHistory, requireNote, readContent: read })

  return {
    list,
    read,
    create,
    write,
    remove,
    restore,
    listHistory: history.listHistory,
    readHistory: history.readHistory,
    restoreHistory: history.restoreHistory,
    removeHistory: history.removeHistory,
    clearHistory: history.clearHistory,
  }
}
