import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'
import { enqueueWrite } from './write-queue.ts'

const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const MAX_TEXT_LENGTH = 4000
const EDITABLE_FIELDS = ['note', 'quote', 'annotation', 'color']
const COLORS = new Set(['yellow', 'green', 'blue', 'pink', 'purple'])

export type NoteKind = 'annotation' | 'bookmark'

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface NoteRecord {
  id: string
  bookId: string
  kind: NoteKind
  color: HighlightColor
  chapterId: string
  blockIndex: number
  offset: number
  quote: string
  note: string
  annotation: string
  quotePrefix?: string
  quoteSuffix?: string
  textHash?: string
  start?: number
  end?: number
  blockHash?: string
  createdAt: number
  updatedAt: number
}

export interface NewNoteInput {
  chapterId?: unknown
  blockIndex?: unknown
  offset?: unknown
  kind?: unknown
  color?: unknown
  quote?: unknown
  note?: unknown
  annotation?: unknown
  quotePrefix?: unknown
  quoteSuffix?: unknown
  textHash?: unknown
  start?: unknown
  end?: unknown
  blockHash?: unknown
}

export interface NotePatch {
  note?: string
  quote?: string
  annotation?: string
  color?: HighlightColor
}

export interface NotesStore {
  list(bookId: string): Promise<NoteRecord[]>
  add(bookId: string, input?: NewNoteInput): Promise<NoteRecord>
  update(bookId: string, noteId: string, patch: NotePatch): Promise<NoteRecord>
  remove(bookId: string, noteId: string): Promise<boolean>
  restore(record: NoteRecord): Promise<NoteRecord>
}

interface NoteFields {
  kind: NoteKind
  color: HighlightColor
  chapterId: string
  blockIndex: number
  offset: number
  quote: string
  note: string
  annotation: string
  quotePrefix?: string
  quoteSuffix?: string
  textHash?: string
  start?: number
  end?: number
  blockHash?: string
}

function normalizeKind(kind: unknown): NoteKind {
  return kind === 'bookmark' ? 'bookmark' : 'annotation'
}

function normalizeNote(note: any): NoteRecord {
  const kind = normalizeKind(note.kind)
  const body = typeof note.note === 'string' && note.note
    ? note.note
    : typeof note.annotation === 'string'
      ? note.annotation
      : ''
  return {
    ...note,
    kind,
    color: normalizeColor(note.color),
    note: kind === 'annotation' ? body : (typeof note.note === 'string' ? note.note : ''),
    annotation: kind === 'bookmark' && typeof note.annotation === 'string' ? note.annotation : '',
  }
}

function normalizeColor(color: unknown): HighlightColor {
  return COLORS.has(color as string) ? color as HighlightColor : 'yellow'
}

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
  return bookId
}

function assertNoteId(noteId: unknown): string {
  if (typeof noteId !== 'string' || !noteId) {
    throw new Error('noteId must be a non-empty string')
  }
  return noteId
}

function assertPosition(name: string, value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
  return value as number
}

function assertText(name: string, value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) {
    throw new Error(`${name} must be a string of at most ${MAX_TEXT_LENGTH} characters`)
  }
  return value
}

function assertChapterId(chapterId: unknown): string {
  if (typeof chapterId !== 'string' || !chapterId.trim()) {
    throw new Error('chapterId must be a non-empty string')
  }
  return chapterId
}

function assertOptionalText(name: string, value: unknown, limit = 120): string {
  if (value === undefined) return ''
  if (typeof value !== 'string' || value.length > limit) {
    throw new Error(`${name} must be a string of at most ${limit} characters`)
  }
  return value
}

function validateNewNote(input: NewNoteInput | undefined): NoteFields {
  if (!input || typeof input !== 'object') throw new Error('note input is required')
  const chapterId = assertChapterId(input.chapterId)
  const blockIndex = assertPosition('blockIndex', input.blockIndex)
  const offset = assertPosition('offset', input.offset)
  const kind = normalizeKind(input.kind)
  if (input.color !== undefined && !COLORS.has(input.color as string)) {
    throw new Error(`unknown highlight color: ${String(input.color)}`)
  }
  const quote = assertText('quote', input.quote ?? '')
  const rawNote = assertText('note', input.note ?? '')
  const annotation = assertText('annotation', input.annotation ?? '')
  const note = kind === 'annotation' ? (rawNote || annotation) : rawNote
  if (kind === 'bookmark' && !note.trim()) {
    throw new Error('bookmark label must not be empty')
  }
  const quotePrefix = assertOptionalText('quotePrefix', input.quotePrefix)
  const quoteSuffix = assertOptionalText('quoteSuffix', input.quoteSuffix)
  const textHash = assertOptionalText('textHash', input.textHash, 32)
  const start = input.start === undefined ? undefined : assertPosition('start', input.start)
  const end = input.end === undefined ? undefined : assertPosition('end', input.end)
  const blockHash = assertOptionalText('blockHash', input.blockHash, 32)
  return {
    kind,
    color: normalizeColor(input.color),
    chapterId,
    blockIndex,
    offset,
    quote,
    note,
    annotation: kind === 'bookmark' ? annotation : '',
    ...(quotePrefix ? { quotePrefix } : {}),
    ...(quoteSuffix ? { quoteSuffix } : {}),
    ...(textHash ? { textHash } : {}),
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
    ...(blockHash ? { blockHash } : {}),
  }
}

function validatePatch(patch: unknown): NotePatch {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('patch must be an object')
  }
  const changes: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(patch)) {
    if (!EDITABLE_FIELDS.includes(name)) {
      throw new Error(`patch may only update ${EDITABLE_FIELDS.join(' or ')}`)
    }
    if (name === 'color') {
      if (!COLORS.has(value as string)) throw new Error(`unknown highlight color: ${String(value)}`)
      changes.color = value
      continue
    }
    changes[name] = assertText(name, value)
  }
  if (Object.keys(changes).length === 0) {
    throw new Error('patch must update note or quote')
  }
  return changes as NotePatch
}

async function readNotes(path: string): Promise<any[]> {
  const notes = await readJson<any[]>(path, [])
  if (!Array.isArray(notes)) throw new Error(`notes file is not an array: ${path}`)
  return notes
}

export function notesPath(dataDir: string, bookId: unknown): string {
  const id = assertBookId(bookId)
  return join(dataDir, 'notes', `${id}.json`)
}

export function createNotesStore(dataDir: string): NotesStore {
  return {
    async list(bookId) {
      const notes = await readNotes(notesPath(dataDir, bookId))
      return notes.map(normalizeNote).sort((left, right) => right.createdAt - left.createdAt)
    },

    async add(bookId, input) {
      const path = notesPath(dataDir, bookId)
      const fields = validateNewNote(input)
      const now = Date.now()
      const record: NoteRecord = {
        id: `note-${now.toString(36)}-${randomBytes(4).toString('hex')}`,
        bookId,
        ...fields,
        createdAt: now,
        updatedAt: now,
      }
      return enqueueWrite(path, async () => {
        const notes = await readNotes(path)
        notes.unshift(record)
        await writeJson(path, notes)
        return record
      })
    },

    async update(bookId, noteId, patch) {
      const path = notesPath(dataDir, bookId)
      assertNoteId(noteId)
      const changes = validatePatch(patch)
      return enqueueWrite(path, async () => {
        const notes = await readNotes(path)
        const index = notes.findIndex(note => note.id === noteId)
        if (index === -1) throw new Error(`note not found: ${noteId}`)
        const updated: NoteRecord = normalizeNote({ ...notes[index], ...changes, updatedAt: Date.now() })
        notes[index] = updated
        await writeJson(path, notes)
        return updated
      })
    },

    async remove(bookId, noteId) {
      const path = notesPath(dataDir, bookId)
      assertNoteId(noteId)
      return enqueueWrite(path, async () => {
        const notes = await readNotes(path)
        const index = notes.findIndex(note => note.id === noteId)
        if (index === -1) return false
        notes.splice(index, 1)
        await writeJson(path, notes)
        return true
      })
    },

    async restore(record) {
      const path = notesPath(dataDir, record.bookId)
      return enqueueWrite(path, async () => {
        const notes = await readNotes(path)
        const index = notes.findIndex(note => note.id === record.id)
        if (index === -1) notes.unshift(record)
        else notes[index] = record
        await writeJson(path, notes)
        return record
      })
    },
  }
}
