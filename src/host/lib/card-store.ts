import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

export interface CardValue {
  text: string
  characters: number
}

export interface CardHistoryEntry extends CardValue {
  id: string
  createdAt: number
}

export class CardStoreError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'CardStoreError'
    this.code = code
  }
}

export interface CardStoreOptions {
  maxCharacters: number
  historyLimit?: number
  namePattern?: RegExp
  invalidNameCode?: string
  tooLargeCode?: string
  invalidContentCode?: string
  invalidPathCode?: string
}

export interface CardStore {
  read(name: string): Promise<CardValue>
  write(name: string, text: string): Promise<CardValue>
  clear(name: string): Promise<void>
  listHistory(name: string): Promise<CardHistoryEntry[]>
  readHistory(name: string, id: string): Promise<CardHistoryEntry>
  restoreHistory(name: string, id: string): Promise<CardValue>
  removeHistory(name: string, id: string): Promise<boolean>
  clearHistory(name: string): Promise<number>
  undo(name: string): Promise<CardValue>
}

const DEFAULT_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const HISTORY_ID_PATTERN = /^\d{1,16}-[a-f0-9]{1,32}$/
const HISTORY_DIR = '.history'

function assertion(value: unknown, code: string, message: string): string {
  if (typeof value !== 'string' || !value) throw new CardStoreError(code, message)
  return value
}

function assertInside(base: string, path: string, code: string): void {
  const root = resolve(base)
  const target = resolve(path)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new CardStoreError(code, '卡片路径越界')
  }
}

function createdAtOf(id: string): number {
  return Number(id.slice(0, id.indexOf('-')))
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

/** Reusable JSON-free card storage with snapshots, undo and an atomic write path. */
export function createCardStore(root: string, options: CardStoreOptions): CardStore {
  const namePattern = options.namePattern ?? DEFAULT_NAME_PATTERN
  const historyLimit = options.historyLimit ?? 10
  const invalidNameCode = options.invalidNameCode ?? 'invalid-name'
  const tooLargeCode = options.tooLargeCode ?? 'card-too-large'
  const invalidContentCode = options.invalidContentCode ?? 'invalid-card'
  const invalidPathCode = options.invalidPathCode ?? 'invalid-card-path'
  let lastSnapshotAt = 0

  function cardName(name: unknown): string {
    const value = assertion(name, invalidNameCode, '卡片名称不合法')
    if (!namePattern.test(value)) throw new CardStoreError(invalidNameCode, '卡片名称不合法')
    return value
  }

  function cardPath(name: string): string {
    const path = join(root, `${name}.md`)
    assertInside(root, path, invalidPathCode)
    return path
  }

  function historyDir(name: string): string {
    const dir = join(root, HISTORY_DIR, name)
    assertInside(root, dir, invalidPathCode)
    return dir
  }

  // 同一毫秒内的多次快照也要有稳定顺序，undo 才能准确恢复“上一个”版本。
  function nextSnapshotStamp(): number {
    lastSnapshotAt = Math.max(Date.now(), lastSnapshotAt + 1)
    return lastSnapshotAt
  }

  async function snapshot(name: string, text: string): Promise<void> {
    const dir = historyDir(name)
    await mkdir(dir, { recursive: true })
    const file = join(dir, `${nextSnapshotStamp()}-${randomBytes(3).toString('hex')}.md`)
    await writeFile(file, text, 'utf8')
    const entries = await readdir(dir)
    const sorted = entries.filter(entry => entry.endsWith('.md')).sort()
    for (const entry of sorted.slice(0, Math.max(0, sorted.length - historyLimit))) {
      await rm(join(dir, entry), { force: true })
    }
  }

  async function read(name: string): Promise<CardValue> {
    const text = await readTextFile(cardPath(cardName(name)))
    return text === null ? { text: '', characters: 0 } : { text, characters: text.length }
  }

  async function write(name: string, value: string): Promise<CardValue> {
    const card = cardName(name)
    if (typeof value !== 'string') throw new CardStoreError(invalidContentCode, '卡片内容必须是字符串')
    const text = value.replace(/\r\n?/g, '\n')
    if (text.length > options.maxCharacters) {
      throw new CardStoreError(tooLargeCode, `卡片最多 ${options.maxCharacters} 个字符`)
    }
    const path = cardPath(card)
    const current = await readTextFile(path)
    if (current) await snapshot(card, current)
    if (!text.trim()) {
      await rm(path, { force: true })
      return { text: '', characters: 0 }
    }
    await atomicWrite(path, text)
    return { text, characters: text.length }
  }

  async function clear(name: string): Promise<void> {
    const card = cardName(name)
    const path = cardPath(card)
    const current = await readTextFile(path)
    if (current) await snapshot(card, current)
    await rm(path, { force: true })
  }

  async function listHistory(name: string): Promise<CardHistoryEntry[]> {
    const dir = historyDir(cardName(name))
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      // 没有历史目录等价于没有快照。
      return []
    }
    const history: CardHistoryEntry[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue
      const id = entry.slice(0, -'.md'.length)
      if (!HISTORY_ID_PATTERN.test(id)) continue
      const text = await readTextFile(join(dir, entry))
      if (text === null) continue
      history.push({ id, text, createdAt: createdAtOf(id), characters: text.length })
    }
    return history.sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))
  }

  async function readHistory(name: string, id: string): Promise<CardHistoryEntry> {
    const snapshotId = assertion(id, 'invalid-history', '历史记录 ID 不合法')
    if (!HISTORY_ID_PATTERN.test(snapshotId)) {
      throw new CardStoreError('invalid-history', '历史记录 ID 不合法')
    }
    const dir = historyDir(cardName(name))
    const path = join(dir, `${snapshotId}.md`)
    assertInside(dir, path, invalidPathCode)
    const text = await readTextFile(path)
    if (text === null) throw new CardStoreError('history-not-found', '历史快照不存在')
    return { id: snapshotId, text, createdAt: createdAtOf(snapshotId), characters: text.length }
  }

  async function restoreHistory(name: string, id: string): Promise<CardValue> {
    const card = cardName(name)
    const restored = await readHistory(card, id)
    const path = cardPath(card)
    const current = await readTextFile(path)
    if (current) await snapshot(card, current)
    if (!restored.text.trim()) {
      await rm(path, { force: true })
      return { text: '', characters: 0 }
    }
    await atomicWrite(path, restored.text)
    return { text: restored.text, characters: restored.text.length }
  }

  async function removeHistory(name: string, id: string): Promise<boolean> {
    const snapshotId = assertion(id, 'invalid-history', '历史记录 ID 不合法')
    if (!HISTORY_ID_PATTERN.test(snapshotId)) {
      throw new CardStoreError('invalid-history', '历史记录 ID 不合法')
    }
    const dir = historyDir(cardName(name))
    const path = join(dir, `${snapshotId}.md`)
    assertInside(dir, path, invalidPathCode)
    if (await readTextFile(path) === null) return false
    await rm(path, { force: true })
    return true
  }

  async function clearHistory(name: string): Promise<number> {
    const dir = historyDir(cardName(name))
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return 0
    }
    const ids = entries.filter(entry => entry.endsWith('.md') && HISTORY_ID_PATTERN.test(entry.slice(0, -'.md'.length)))
    await Promise.all(ids.map(entry => rm(join(dir, entry), { force: true })))
    return ids.length
  }

  async function undo(name: string): Promise<CardValue> {
    const card = cardName(name)
    const entries = await listHistory(card)
    if (entries.length === 0) throw new CardStoreError('history-empty', '没有可撤销的历史快照')
    return restoreHistory(card, entries[0].id)
  }

  return { read, write, clear, listHistory, readHistory, restoreHistory, removeHistory, clearHistory, undo }
}
