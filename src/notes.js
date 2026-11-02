import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { readJson, writeJson } from './fsjson.js'

const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const MAX_TEXT_LENGTH = 4000
const EDITABLE_FIELDS = ['note', 'quote']

function assertBookId(bookId) {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
}

function assertNoteId(noteId) {
  if (typeof noteId !== 'string' || !noteId) {
    throw new Error('noteId must be a non-empty string')
  }
}

function assertPosition(name, value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
}

function assertText(name, value) {
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH) {
    throw new Error(`${name} must be a string of at most ${MAX_TEXT_LENGTH} characters`)
  }
}

function assertChapterId(chapterId) {
  if (typeof chapterId !== 'string' || !chapterId.trim()) {
    throw new Error('chapterId must be a non-empty string')
  }
}

function validateNewNote(input) {
  if (!input || typeof input !== 'object') throw new Error('note input is required')
  assertChapterId(input.chapterId)
  assertPosition('blockIndex', input.blockIndex)
  assertPosition('offset', input.offset)
  assertText('quote', input.quote)
  assertText('note', input.note)
  return {
    chapterId: input.chapterId,
    blockIndex: input.blockIndex,
    offset: input.offset,
    quote: input.quote,
    note: input.note,
  }
}

function validatePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('patch must be an object')
  }
  const changes = {}
  for (const [name, value] of Object.entries(patch)) {
    if (!EDITABLE_FIELDS.includes(name)) {
      throw new Error(`patch may only update ${EDITABLE_FIELDS.join(' or ')}`)
    }
    assertText(name, value)
    changes[name] = value
  }
  if (Object.keys(changes).length === 0) {
    throw new Error('patch must update note or quote')
  }
  return changes
}

async function readNotes(path) {
  const notes = await readJson(path, [])
  if (!Array.isArray(notes)) throw new Error(`notes file is not an array: ${path}`)
  return notes
}

export function notesPath(dataDir, bookId) {
  assertBookId(bookId)
  return join(dataDir, 'notes', `${bookId}.json`)
}

export function createNotesStore(dataDir) {
  return {
    async list(bookId) {
      const notes = await readNotes(notesPath(dataDir, bookId))
      return notes.slice().sort((left, right) => right.createdAt - left.createdAt)
    },

    async add(bookId, input) {
      const path = notesPath(dataDir, bookId)
      const fields = validateNewNote(input)
      const now = Date.now()
      const record = {
        id: `note-${now.toString(36)}-${randomBytes(4).toString('hex')}`,
        bookId,
        ...fields,
        createdAt: now,
        updatedAt: now,
      }
      const notes = await readNotes(path)
      notes.unshift(record)
      await writeJson(path, notes)
      return record
    },

    async update(bookId, noteId, patch) {
      const path = notesPath(dataDir, bookId)
      assertNoteId(noteId)
      const changes = validatePatch(patch)
      const notes = await readNotes(path)
      const index = notes.findIndex(note => note.id === noteId)
      if (index === -1) throw new Error(`note not found: ${noteId}`)
      const updated = { ...notes[index], ...changes, updatedAt: Date.now() }
      notes[index] = updated
      await writeJson(path, notes)
      return updated
    },

    async remove(bookId, noteId) {
      const path = notesPath(dataDir, bookId)
      assertNoteId(noteId)
      const notes = await readNotes(path)
      const index = notes.findIndex(note => note.id === noteId)
      if (index === -1) return false
      notes.splice(index, 1)
      await writeJson(path, notes)
      return true
    },
  }
}
