import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

export interface MemoryCard {
  text: string
  characters: number
}

export interface MemoryHistoryEntry {
  id: string
  createdAt: number
  characters: number
}

export interface MemoryHistorySnapshot {
  id: string
  text: string
  createdAt: number
  characters: number
}

export interface MemoryStore {
  readBook(bookId: string): Promise<MemoryCard>
  readReader(): Promise<MemoryCard>
  writeBook(bookId: string, text: string): Promise<MemoryCard>
  writeReader(text: string): Promise<MemoryCard>
  listHistory(bookId: string | null): Promise<MemoryHistoryEntry[]>
  readHistory(bookId: string | null, id: string): Promise<MemoryHistorySnapshot>
  undo(bookId: string | null): Promise<MemoryCard>
  clearBook(bookId: string): Promise<void>
  clearReader(): Promise<void>
}

const MEMORY_DIR = 'memory'
const READER_CARD = 'reader'
const HISTORY_DIR = '.history'
const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const HISTORY_ID_PATTERN = /^\d{1,16}-[a-f0-9]{1,32}$/
const MAX_BOOK_CHARACTERS = 4000
const MAX_READER_CHARACTERS = 2000
const MAX_HISTORY = 10

export class MemoryStoreError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MemoryStoreError'
    this.code = code
  }
}

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId) || bookId === READER_CARD) {
    throw new MemoryStoreError('invalid-book', 'bookId 不合法')
  }
  return bookId
}

function assertHistoryId(id: unknown): string {
  if (typeof id !== 'string' || !HISTORY_ID_PATTERN.test(id)) {
    throw new MemoryStoreError('invalid-history', '历史记录 ID 不合法')
  }
  return id
}

function assertInside(base: string, path: string): void {
  const root = resolve(base)
  const target = resolve(path)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new MemoryStoreError('invalid-memory', '记忆路径越界')
  }
}

function createdAtOf(id: string): number {
  return Number(id.slice(0, id.indexOf('-')))
}

function normalizeCardText(value: unknown, max: number): string {
  if (typeof value !== 'string') throw new MemoryStoreError('invalid-memory', '记忆内容必须是字符串')
  const text = value.replace(/\r\n?/g, '\n')
  if (text.length > max) {
    throw new MemoryStoreError('memory-too-large', `记忆卡最多 ${max} 个字符`)
  }
  return text
}

async function readTextFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return null
    throw error
  }
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${randomBytes(3).toString('hex')}.tmp`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

export function createMemoryStore(dataDir: string): MemoryStore {
  const root = join(dataDir, MEMORY_DIR)
  let lastSnapshotAt = 0

  function cardName(bookId: string | null): string {
    return bookId === null ? READER_CARD : assertBookId(bookId)
  }

  function cardPath(name: string): string {
    const path = join(root, `${name}.md`)
    assertInside(root, path)
    return path
  }

  function cardHistoryDir(name: string): string {
    const dir = join(root, HISTORY_DIR, name)
    assertInside(root, dir)
    return dir
  }

  // 同一毫秒内的多次快照也要有稳定顺序，undo 才能准确恢复“上一个”版本。
  function nextSnapshotStamp(): number {
    lastSnapshotAt = Math.max(Date.now(), lastSnapshotAt + 1)
    return lastSnapshotAt
  }

  async function snapshot(name: string, text: string): Promise<void> {
    const dir = cardHistoryDir(name)
    await mkdir(dir, { recursive: true })
    const file = join(dir, `${nextSnapshotStamp()}-${randomBytes(3).toString('hex')}.md`)
    await writeFile(file, text, 'utf8')
    const entries = await readdir(dir)
    const sorted = entries.filter(entry => entry.endsWith('.md')).sort()
    for (const entry of sorted.slice(0, Math.max(0, sorted.length - MAX_HISTORY))) {
      await rm(join(dir, entry), { force: true })
    }
  }

  async function readCard(name: string): Promise<MemoryCard> {
    const text = await readTextFile(cardPath(name))
    return text === null ? { text: '', characters: 0 } : { text, characters: text.length }
  }

  async function writeCard(name: string, value: string, max: number): Promise<MemoryCard> {
    const text = normalizeCardText(value, max)
    const path = cardPath(name)
    const current = await readTextFile(path)
    if (current) await snapshot(name, current)
    if (!text.trim()) {
      await rm(path, { force: true })
      return { text: '', characters: 0 }
    }
    await atomicWrite(path, text)
    return { text, characters: text.length }
  }

  async function clearCard(name: string): Promise<void> {
    const path = cardPath(name)
    const current = await readTextFile(path)
    if (current) await snapshot(name, current)
    await rm(path, { force: true })
  }

  async function listHistory(name: string): Promise<MemoryHistoryEntry[]> {
    const dir = cardHistoryDir(name)
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      // 没有历史目录等价于没有快照。
      return []
    }
    const history: MemoryHistoryEntry[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue
      const id = entry.slice(0, -'.md'.length)
      if (!HISTORY_ID_PATTERN.test(id)) continue
      const text = await readTextFile(join(dir, entry))
      if (text === null) continue
      history.push({ id, createdAt: createdAtOf(id), characters: text.length })
    }
    return history.sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))
  }

  async function readHistory(name: string, id: string): Promise<MemoryHistorySnapshot> {
    const snapshotId = assertHistoryId(id)
    const dir = cardHistoryDir(name)
    const path = join(dir, `${snapshotId}.md`)
    assertInside(dir, path)
    const text = await readTextFile(path)
    if (text === null) throw new MemoryStoreError('history-not-found', '历史快照不存在')
    return { id: snapshotId, text, createdAt: createdAtOf(snapshotId), characters: text.length }
  }

  async function undo(name: string): Promise<MemoryCard> {
    const entries = await listHistory(name)
    if (entries.length === 0) throw new MemoryStoreError('history-empty', '没有可撤销的历史快照')
    const restored = await readHistory(name, entries[0].id)
    const path = cardPath(name)
    const current = await readTextFile(path)
    if (current) await snapshot(name, current)
    if (!restored.text.trim()) {
      await rm(path, { force: true })
      return { text: '', characters: 0 }
    }
    await atomicWrite(path, restored.text)
    return { text: restored.text, characters: restored.text.length }
  }

  return {
    readBook: async bookId => readCard(assertBookId(bookId)),
    readReader: async () => readCard(READER_CARD),
    writeBook: async (bookId, text) => writeCard(assertBookId(bookId), text, MAX_BOOK_CHARACTERS),
    writeReader: async text => writeCard(READER_CARD, text, MAX_READER_CHARACTERS),
    listHistory: async bookId => listHistory(cardName(bookId)),
    readHistory: async (bookId, id) => readHistory(cardName(bookId), id),
    undo: async bookId => undo(cardName(bookId)),
    clearBook: async bookId => clearCard(assertBookId(bookId)),
    clearReader: async () => clearCard(READER_CARD),
  }
}
