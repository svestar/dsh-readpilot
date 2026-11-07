import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'

export const NOTES_DIR_NAME = 'notes'
export const NOTES_MARKER = '.dsh-readpilot-notes'
export const BOOK_NOTE_FILE = 'book.md'
const BOOK_META_FILE = '.book.json'
const HISTORY_DIR = '.history'
const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const NOTE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const HISTORY_ID_PATTERN = /^\d{10,16}-[0-9a-f]{6,32}\.md$/
const MAX_TITLE = 80
const MAX_BODY = 200_000
const MAX_HISTORY = 10
const META_CACHE_LIMIT = 256
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export class NoteFileError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'NoteFileError'
    this.code = code
  }
}

export interface NoteBookRef {
  id: string
  title: string
  path?: string
}

export type NoteFileKind = 'book' | 'topic'

export interface NoteFileRecord {
  id: string
  kind: NoteFileKind
  title: string
  bookId: string
  fileName: string
  path: string
  size: number
  hash: string
  createdAt: number
  updatedAt: number
}

export interface NoteFileContent {
  note: NoteFileRecord
  body: string
  hash: string
}

export interface NoteHistoryEntry {
  id: string
  /** 历史文件名中的毫秒时间戳；无法解析时回退到文件 mtime。 */
  createdAt: number
  /** 去掉 frontmatter 后的正文长度（UTF-16 码元，即 string.length）。 */
  characters: number
}

interface BookMeta {
  version: number
  bookId: string
  title: string
  sourcePath?: string
}

interface ParsedNote {
  meta: Record<string, string>
  body: string
}

interface NoteFileStoreOptions {
  maxHistory?: number
}

function hashOf(value: string): string {
  return createHash('sha1').update(value).digest('hex')
}

function now(): number {
  return Date.now()
}

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    throw new NoteFileError('invalid-book', 'bookId 不合法')
  }
  return bookId
}

function assertNoteId(noteId: unknown): string {
  if (typeof noteId !== 'string' || !NOTE_ID_PATTERN.test(noteId)) {
    throw new NoteFileError('invalid-note', '笔记 id 不合法')
  }
  return noteId
}

function assertHistoryId(historyId: unknown): string {
  if (typeof historyId !== 'string' || !HISTORY_ID_PATTERN.test(historyId)) {
    throw new NoteFileError('invalid-history', '历史版本 id 不合法')
  }
  return historyId
}

function sanitizeTitle(value: unknown, fallback: string): string {
  const title = typeof value === 'string'
    ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_TITLE)
    : ''
  return title || fallback
}

function slugify(value: string): string {
  const slug = value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\- ]+|[.\- ]+$/g, '')
    .slice(0, 48)
  const safe = slug || 'note'
  return WINDOWS_RESERVED.test(safe) ? `note-${safe}` : safe
}

function bodyOf(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (value.length > MAX_BODY) throw new NoteFileError('note-too-large', '笔记正文过长')
  return `${value.replace(/\r\n?/g, '\n').replace(/\s+$/g, '')}\n`
}

function parseFrontMatter(raw: string): ParsedNote {
  const text = raw.replace(/^\uFEFF/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { meta: {}, body: text.replace(/^\n/, '') }
  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line)
    if (!entry) continue
    let value = entry[2].trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = String(JSON.parse(value))
      } catch {
        value = value.slice(1, -1)
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    }
    meta[entry[1]] = value
  }
  return { meta, body: text.slice(match[0].length).replace(/^\n/, '') }
}

function serializeNote(meta: Record<string, string | number>, body: string): string {
  const lines = [
    '---',
    `id: ${meta.id}`,
    `kind: ${meta.kind}`,
    `title: ${JSON.stringify(String(meta.title))}`,
    `bookId: ${meta.bookId}`,
    `created: ${meta.created}`,
    `updated: ${meta.updated}`,
    '---',
    '',
    body,
  ]
  return lines.join('\n')
}

function parseNote(raw: string, fileName: string, book: NoteBookRef, mtime: number, path: string): { note: NoteFileRecord; body: string } {
  const parsed = parseFrontMatter(raw)
  const kind: NoteFileKind = fileName === BOOK_NOTE_FILE || parsed.meta.kind === 'book' ? 'book' : 'topic'
  const rawId = parsed.meta.id
  const id = rawId && NOTE_ID_PATTERN.test(rawId)
    ? rawId
    : (kind === 'book' ? 'book' : `file-${hashOf(`${book.id}/${fileName}`).slice(0, 12)}`)
  const created = Number(parsed.meta.created)
  const updated = Number(parsed.meta.updated)
  const note: NoteFileRecord = {
    id,
    kind,
    title: sanitizeTitle(parsed.meta.title, kind === 'book' ? '整书笔记' : basename(fileName, '.md')),
    bookId: book.id,
    fileName,
    path,
    size: Buffer.byteLength(raw, 'utf8'),
    hash: hashOf(raw),
    createdAt: Number.isFinite(created) && created > 0 ? created : mtime,
    updatedAt: Number.isFinite(updated) && updated > 0 ? updated : mtime,
  }
  return { note, body: parsed.body }
}

async function atomicWrite(path: string, content: string): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomBytes(3).toString('hex')}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function ensureRoot(root: string): Promise<void> {
  await mkdir(root, { recursive: true })
  const marker = join(root, NOTES_MARKER)
  if (await exists(marker)) return
  try {
    await writeFile(marker, 'dsh-readpilot notes\n', { encoding: 'utf8', flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code !== 'EEXIST') throw error
  }
}

async function readBookMeta(dir: string): Promise<BookMeta | null> {
  try {
    const value = await readJson<BookMeta | null>(join(dir, BOOK_META_FILE), null)
    return value && typeof value.bookId === 'string' ? value : null
  } catch {
    return null
  }
}

async function findBookDir(root: string, bookId: string): Promise<string | null> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return null
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const dir = join(root, entry.name)
    const meta = await readBookMeta(dir)
    if (meta?.bookId === bookId) return dir
  }
  return null
}

async function ensureBookDir(root: string, book: NoteBookRef): Promise<string> {
  const bookId = assertBookId(book.id)
  await ensureRoot(root)
  const existing = await findBookDir(root, bookId)
  if (existing) return existing
  const title = sanitizeTitle(book.title, '书籍')
  const base = `${slugify(title)}-${bookId.slice(0, 8)}`
  let dir = join(root, base)
  let index = 2
  while (await exists(dir)) {
    dir = join(root, `${base}-${index}`)
    index += 1
  }
  await mkdir(dir, { recursive: true })
  await writeJson(join(dir, BOOK_META_FILE), {
    version: 1,
    bookId,
    title,
    ...(book.path ? { sourcePath: book.path } : {}),
  })
  return dir
}

async function uniqueFileName(dir: string, slug: string, ignore?: string): Promise<string> {
  let name = `${slug}.md`
  let index = 2
  while (name !== ignore && await exists(join(dir, name))) {
    name = `${slug}-${index}.md`
    index += 1
  }
  return name
}

function assertInside(dir: string, path: string): void {
  const base = resolve(dir)
  const target = resolve(path)
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new NoteFileError('invalid-note', '笔记路径越界')
  }
}

function historyStamp(id: string, mtime: number): number {
  const stamp = Number(/^(\d+)-/.exec(id)?.[1] ?? NaN)
  return Number.isFinite(stamp) && stamp > 0 ? stamp : mtime
}

function historyDirOf(dir: string, noteId: string): string {
  const historyDir = join(dir, HISTORY_DIR)
  const target = join(historyDir, assertNoteId(noteId))
  assertInside(historyDir, target)
  return target
}

async function readHistoryFile(dir: string, noteId: string, historyId: string): Promise<{ id: string; raw: string; createdAt: number }> {
  const id = assertHistoryId(historyId)
  const historyDir = historyDirOf(dir, noteId)
  const path = join(historyDir, id)
  assertInside(historyDir, path)
  let raw: string
  let info
  try {
    raw = await readFile(path, 'utf8')
    info = await stat(path)
  } catch {
    throw new NoteFileError('history-not-found', '历史版本不存在')
  }
  return { id, raw, createdAt: historyStamp(id, info.mtimeMs) }
}

async function recordOf(dir: string, fileName: string, book: NoteBookRef): Promise<{ note: NoteFileRecord; body: string } | null> {
  const path = join(dir, fileName)
  assertInside(dir, path)
  let raw: string
  let info
  try {
    raw = await readFile(path, 'utf8')
    info = await stat(path)
  } catch {
    return null
  }
  return parseNote(raw, fileName, book, info.mtimeMs, `notes/${basename(dir)}/${fileName}`)
}

export interface NoteFileStore {
  list(book: NoteBookRef): Promise<NoteFileRecord[]>
  read(book: NoteBookRef, id: string): Promise<NoteFileContent>
  create(book: NoteBookRef, input: { title?: unknown; kind?: unknown; body?: unknown }): Promise<NoteFileContent>
  write(book: NoteBookRef, id: string, input: { title?: unknown; body?: unknown; baseHash?: unknown }): Promise<NoteFileContent>
  remove(book: NoteBookRef, id: string): Promise<boolean>
  listHistory(book: NoteBookRef, noteId: string): Promise<NoteHistoryEntry[]>
  readHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<{ id: string; body: string; content: string; createdAt: number; characters: number }>
  restoreHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<NoteFileContent>
  removeHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<boolean>
  clearHistory(book: NoteBookRef, noteId: string): Promise<number>
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
    let raw: string
    try {
      raw = await readFile(path, 'utf8')
    } catch {
      forgetMeta(path)
      return null
    }
    const parsed = parseNote(raw, fileName, book, info.mtimeMs, `notes/${basename(dir)}/${fileName}`)
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
    const id = kind === 'book' ? 'book' : `note-${now().toString(36)}-${randomBytes(4).toString('hex')}`
    const stamp = now()
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
    const current = await (async () => {
      for (const note of await list(book)) {
        if (note.id === id) return note
      }
      return null
    })()
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
    const stamp = now()
    const content = serializeNote({
      id: current.id,
      kind,
      title,
      bookId: book.id,
      created: current.createdAt,
      updated: stamp,
    }, bodyOf(input.body ?? parsed.body))
    await writeHistory(dir, current.id, raw, maxHistory)
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

  async function listHistory(book: NoteBookRef, noteId: string): Promise<NoteHistoryEntry[]> {
    const { dir, note } = await requireNote(book, assertNoteId(noteId))
    const historyDir = historyDirOf(dir, note.id)
    let names
    try {
      names = await readdir(historyDir)
    } catch {
      return []
    }
    const entries: NoteHistoryEntry[] = []
    for (const name of names) {
      if (!HISTORY_ID_PATTERN.test(name)) continue
      const path = join(historyDir, name)
      assertInside(historyDir, path)
      let raw: string
      let info
      try {
        raw = await readFile(path, 'utf8')
        info = await stat(path)
      } catch {
        continue
      }
      entries.push({
        id: name,
        createdAt: historyStamp(name, info.mtimeMs),
        characters: parseFrontMatter(raw).body.length,
      })
    }
    entries.sort((left, right) => {
      if (left.createdAt !== right.createdAt) return right.createdAt - left.createdAt
      return left.id < right.id ? 1 : left.id > right.id ? -1 : 0
    })
    return entries.slice(0, maxHistory)
  }

  async function readHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<{ id: string; body: string; content: string; createdAt: number; characters: number }> {
    const { dir, note } = await requireNote(book, assertNoteId(noteId))
    const snapshot = await readHistoryFile(dir, note.id, historyId)
    const body = parseFrontMatter(snapshot.raw).body
    return {
      id: snapshot.id,
      body,
      content: snapshot.raw,
      createdAt: snapshot.createdAt,
      characters: body.length,
    }
  }

  async function restoreHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<NoteFileContent> {
    const { dir, note } = await requireNote(book, assertNoteId(noteId))
    const snapshot = await readHistoryFile(dir, note.id, historyId)
    const path = join(dir, note.fileName)
    assertInside(dir, path)
    let currentRaw: string
    try {
      currentRaw = await readFile(path, 'utf8')
    } catch {
      throw new NoteFileError('note-not-found', '笔记不存在')
    }
    await writeHistory(dir, note.id, currentRaw, maxHistory)
    await atomicWrite(path, snapshot.raw)
    forgetMeta(path)
    return read(book, note.id)
  }

  async function removeHistory(book: NoteBookRef, noteId: string, historyId: string): Promise<boolean> {
    const { dir, note } = await requireNote(book, assertNoteId(noteId))
    const historyDir = historyDirOf(dir, note.id)
    const id = assertHistoryId(historyId)
    const path = join(historyDir, id)
    assertInside(historyDir, path)
    try {
      await readFile(path, 'utf8')
    } catch {
      return false
    }
    await rm(path, { force: true })
    return true
  }

  async function clearHistory(book: NoteBookRef, noteId: string): Promise<number> {
    const { dir, note } = await requireNote(book, assertNoteId(noteId))
    const historyDir = historyDirOf(dir, note.id)
    let names: string[]
    try {
      names = await readdir(historyDir)
    } catch {
      return 0
    }
    const ids = names.filter(name => HISTORY_ID_PATTERN.test(name))
    await Promise.all(ids.map(name => rm(join(historyDir, name), { force: true })))
    return ids.length
  }

  return { list, read, create, write, remove, listHistory, readHistory, restoreHistory, removeHistory, clearHistory }
}

async function writeHistory(dir: string, id: string, raw: string, maxHistory: number): Promise<void> {
  const historyDir = join(dir, HISTORY_DIR, id)
  await mkdir(historyDir, { recursive: true })
  const file = join(historyDir, `${now()}-${randomBytes(3).toString('hex')}.md`)
  await writeFile(file, raw, 'utf8')
  let entries
  try {
    entries = await readdir(historyDir)
  } catch {
    return
  }
  const sorted = entries.filter(name => name.endsWith('.md')).sort()
  for (const name of sorted.slice(0, Math.max(0, sorted.length - maxHistory))) {
    await rm(join(historyDir, name), { force: true })
  }
}
