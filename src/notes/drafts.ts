import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { readJson, writeJson } from '../storage/fsjson.ts'
import type { NoteBookRef, NoteFileContent, NoteFileKind, NoteFileStore } from './files.ts'

export type NoteDraftAction = 'create' | 'write' | 'append'

export interface NoteDraftRecord {
  id: string
  bookId: string
  action: NoteDraftAction
  noteId?: string
  kind: NoteFileKind
  title: string
  body: string
  baseBody: string
  baseHash?: string
  createdAt: number
}

export interface NoteDraftInput {
  action?: unknown
  noteId?: unknown
  title?: unknown
  kind?: unknown
  body?: unknown
  text?: unknown
}

const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const DRAFT_ID_PATTERN = /^draft-[A-Za-z0-9_-]{1,80}$/
const MAX_TITLE = 80
const MAX_BODY = 200_000
const MAX_DRAFTS = 50

export class NoteDraftError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'NoteDraftError'
    this.code = code
  }
}

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    throw new NoteDraftError('invalid-book', 'bookId 不合法')
  }
  return bookId
}

function assertDraftId(draftId: unknown): string {
  if (typeof draftId !== 'string' || !DRAFT_ID_PATTERN.test(draftId)) {
    throw new NoteDraftError('invalid-draft', '草稿 ID 不合法')
  }
  return draftId
}

function titleOf(value: unknown, fallback: string): string {
  const title = typeof value === 'string'
    ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_TITLE)
    : ''
  return title || fallback
}

function bodyOf(value: unknown): string {
  if (typeof value !== 'string') throw new NoteDraftError('invalid-draft', '草稿正文必须是字符串')
  if (value.length > MAX_BODY) throw new NoteDraftError('note-too-large', '笔记正文过长')
  return `${value.replace(/\r\n?/g, '\n').replace(/\s+$/g, '')}\n`
}

function appendBody(base: string, text: unknown): string {
  if (typeof text !== 'string' || !text.trim()) {
    throw new NoteDraftError('invalid-draft', '追加内容不能为空')
  }
  const before = base.replace(/\s+$/g, '')
  const addition = text.replace(/\r\n?/g, '\n').trim()
  return bodyOf(before ? `${before}\n\n${addition}` : addition)
}

function draftDir(dataDir: string, bookId: string): string {
  return join(dataDir, 'drafts', assertBookId(bookId))
}

function draftPath(dataDir: string, bookId: string, draftId: string): string {
  const dir = draftDir(dataDir, bookId)
  const path = join(dir, `${assertDraftId(draftId)}.json`)
  const base = resolve(dir)
  if (!resolve(path).startsWith(`${base}${sep}`)) {
    throw new NoteDraftError('invalid-draft', '草稿路径越界')
  }
  return path
}

function validDraft(value: unknown): value is NoteDraftRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as NoteDraftRecord
  return typeof record.id === 'string'
    && typeof record.bookId === 'string'
    && (record.action === 'create' || record.action === 'write' || record.action === 'append')
    && typeof record.title === 'string'
    && typeof record.body === 'string'
    && typeof record.createdAt === 'number'
}

export interface NoteDraftStore {
  list(book: NoteBookRef): Promise<NoteDraftRecord[]>
  create(book: NoteBookRef, input: NoteDraftInput): Promise<NoteDraftRecord>
  apply(book: NoteBookRef, draftId: string): Promise<NoteFileContent>
  reject(book: NoteBookRef, draftId: string): Promise<boolean>
}

export function createNoteDraftStore(dataDir: string, notes: NoteFileStore): NoteDraftStore {
  async function list(book: NoteBookRef): Promise<NoteDraftRecord[]> {
    const dir = draftDir(dataDir, book.id)
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const drafts: NoteDraftRecord[] = []
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const value = await readJson<NoteDraftRecord | null>(join(dir, entry.name), null).catch(() => null)
      if (validDraft(value) && value.bookId === book.id) drafts.push(value)
    }
    return drafts.sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_DRAFTS)
  }

  async function create(book: NoteBookRef, input: NoteDraftInput): Promise<NoteDraftRecord> {
    const action = input.action
    if (action !== 'create' && action !== 'write' && action !== 'append') {
      throw new NoteDraftError('invalid-draft', `未知草稿操作：${String(action)}`)
    }
    const bookId = assertBookId(book.id)
    let draft: NoteDraftRecord
    if (action === 'create') {
      draft = {
        id: `draft-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
        bookId,
        action,
        kind: input.kind === 'book' ? 'book' : 'topic',
        title: titleOf(input.title, '未命名'),
        body: bodyOf(input.body ?? ''),
        baseBody: '',
        createdAt: Date.now(),
      }
    } else {
      const noteId = String(input.noteId ?? '')
      if (!noteId) throw new NoteDraftError('invalid-draft', '草稿需要目标笔记')
      const current = await notes.read(book, noteId)
      const body = action === 'append'
        ? appendBody(current.body, input.text)
        : bodyOf(input.body ?? current.body)
      draft = {
        id: `draft-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
        bookId,
        action,
        noteId: current.note.id,
        kind: current.note.kind,
        title: titleOf(input.title, current.note.title),
        body,
        baseBody: current.body,
        baseHash: current.hash,
        createdAt: Date.now(),
      }
    }
    const dir = draftDir(dataDir, bookId)
    await mkdir(dir, { recursive: true })
    await writeJson(draftPath(dataDir, bookId, draft.id), draft)
    return draft
  }

  async function apply(book: NoteBookRef, draftId: string): Promise<NoteFileContent> {
    const id = assertDraftId(draftId)
    const path = draftPath(dataDir, book.id, id)
    const draft = await readJson<NoteDraftRecord | null>(path, null).catch(() => null)
    if (!validDraft(draft) || draft.bookId !== book.id) {
      throw new NoteDraftError('draft-not-found', '草稿不存在')
    }
    let content: NoteFileContent
    if (draft.action === 'create') {
      content = await notes.create(book, { title: draft.title, kind: draft.kind, body: draft.body })
    } else {
      if (!draft.noteId) throw new NoteDraftError('invalid-draft', '草稿缺少目标笔记')
      content = await notes.write(book, draft.noteId, {
        title: draft.title,
        body: draft.body,
        baseHash: draft.baseHash,
      })
    }
    await rm(path, { force: true })
    return content
  }

  async function reject(book: NoteBookRef, draftId: string): Promise<boolean> {
    const id = assertDraftId(draftId)
    const path = draftPath(dataDir, book.id, id)
    try {
      await readFile(path, 'utf8')
    } catch {
      return false
    }
    await rm(path, { force: true })
    return true
  }

  return { list, create, apply, reject }
}
