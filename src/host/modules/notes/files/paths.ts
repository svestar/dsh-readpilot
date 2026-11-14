import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'node:path'
import type {
  NoteBookRef,
  NoteFileKind,
  NoteFileRecord,
} from '../../../../shared/contracts/notes.ts'
import { NOTES_MARKER } from '../../../lib/notes-paths.ts'
import { readJson, writeJson } from '../../../lib/fs-json.ts'

export const NOTES_DIR_NAME = 'notes'
export const BOOK_NOTE_FILE = 'book.md'
export const BOOK_META_FILE = '.book.json'
export const HISTORY_DIR = '.history'
export const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
export const NOTE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
export const HISTORY_ID_PATTERN = /^\d{10,16}-[0-9a-f]{6,32}\.md$/
export const MAX_TITLE = 80
export const MAX_BODY = 200_000
export const MAX_HISTORY = 10
export const META_CACHE_LIMIT = 256
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export class NoteFileError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'NoteFileError'
    this.code = code
  }
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

export function hashOf(value: string): string {
  return createHash('sha1').update(value).digest('hex')
}

export function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    throw new NoteFileError('invalid-book', 'bookId 不合法')
  }
  return bookId
}

export function assertNoteId(noteId: unknown): string {
  if (typeof noteId !== 'string' || !NOTE_ID_PATTERN.test(noteId)) {
    throw new NoteFileError('invalid-note', '笔记 id 不合法')
  }
  return noteId
}

export function assertHistoryId(historyId: unknown): string {
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

export { sanitizeTitle }

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

export { slugify }

export function bodyOf(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (value.length > MAX_BODY) throw new NoteFileError('note-too-large', '笔记正文过长')
  return `${value.replace(/\r\n?/g, '\n').replace(/\s+$/g, '')}\n`
}

export function parseFrontMatter(raw: string): ParsedNote {
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

export function serializeNote(meta: Record<string, string | number>, body: string): string {
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

export async function atomicWrite(path: string, content: string): Promise<void> {
  const temporary = `${path}.${process.pid}.${randomBytes(3).toString('hex')}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

export async function exists(path: string): Promise<boolean> {
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

export async function findBookDir(root: string, bookId: string): Promise<string | null> {
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

export async function ensureBookDir(root: string, book: NoteBookRef): Promise<string> {
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

export async function uniqueFileName(dir: string, slug: string, ignore?: string): Promise<string> {
  let name = `${slug}.md`
  let index = 2
  while (name !== ignore && await exists(join(dir, name))) {
    name = `${slug}-${index}.md`
    index += 1
  }
  return name
}

export function assertInside(dir: string, path: string): void {
  const base = resolve(dir)
  const target = resolve(path)
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new NoteFileError('invalid-note', '笔记路径越界')
  }
}

export async function recordOf(dir: string, fileName: string, book: NoteBookRef): Promise<{ note: NoteFileRecord; body: string } | null> {
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
