import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  NoteBookRef,
  NoteFileContent,
  NoteFileRecord,
  NoteHistoryEntry,
} from '../../../../shared/contracts/notes.ts'
import {
  HISTORY_DIR,
  HISTORY_ID_PATTERN,
  NoteFileError,
  assertHistoryId,
  assertInside,
  assertNoteId,
  atomicWrite,
  parseFrontMatter,
} from './paths.ts'

export function historyStamp(id: string, mtime: number): number {
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

async function writeHistory(dir: string, id: string, raw: string, maxHistory: number): Promise<void> {
  const historyDir = join(dir, HISTORY_DIR, id)
  await mkdir(historyDir, { recursive: true })
  const file = join(historyDir, `${Date.now()}-${randomBytes(3).toString('hex')}.md`)
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

export interface NoteHistoryDependencies {
  maxHistory: number
  requireNote(book: NoteBookRef, id: string): Promise<{ dir: string; note: NoteFileRecord }>
  readContent(book: NoteBookRef, id: string): Promise<NoteFileContent>
}

export function createNoteHistory({ maxHistory, requireNote, readContent }: NoteHistoryDependencies) {
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
    return readContent(book, note.id)
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

  return { writeHistory, listHistory, readHistory, restoreHistory, removeHistory, clearHistory }
}
