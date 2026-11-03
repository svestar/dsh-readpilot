import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { readJson, writeJson } from './fsjson.ts'

export type MemoryScope = 'book' | 'reader'
export type MemoryUpdateMode = 'append' | 'replace'

export interface MemoryProposalRecord {
  id: string
  bookId: string
  scope: MemoryScope
  mode: MemoryUpdateMode
  text: string
  preview: string
  createdAt: number
}

export interface MemoryProposalInput {
  scope?: unknown
  mode?: unknown
  text?: unknown
  preview?: unknown
}

const BOOK_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const PROPOSAL_ID_PATTERN = /^memory-[A-Za-z0-9_-]{1,80}$/
const MAX_TEXT = 4000
const MAX_PROPOSALS = 20

export class MemoryProposalError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MemoryProposalError'
    this.code = code
  }
}

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    throw new MemoryProposalError('invalid-book', 'bookId 不合法')
  }
  return bookId
}

function assertProposalId(id: unknown): string {
  if (typeof id !== 'string' || !PROPOSAL_ID_PATTERN.test(id)) {
    throw new MemoryProposalError('invalid-proposal', '提议 ID 不合法')
  }
  return id
}

function proposalDir(dataDir: string, bookId: string): string {
  return join(dataDir, 'memory', '.pending', assertBookId(bookId))
}

function proposalPath(dataDir: string, bookId: string, id: string): string {
  const dir = proposalDir(dataDir, bookId)
  const path = join(dir, `${assertProposalId(id)}.json`)
  const base = resolve(dir)
  if (resolve(path).startsWith(`${base}${sep}`)) return path
  throw new MemoryProposalError('invalid-proposal', '提议路径越界')
}

function valid(value: unknown): value is MemoryProposalRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as MemoryProposalRecord
  return typeof record.id === 'string'
    && typeof record.bookId === 'string'
    && (record.scope === 'book' || record.scope === 'reader')
    && (record.mode === 'append' || record.mode === 'replace')
    && typeof record.text === 'string'
    && typeof record.preview === 'string'
    && typeof record.createdAt === 'number'
}

export interface MemoryProposalStore {
  list(bookId: string): Promise<MemoryProposalRecord[]>
  create(bookId: string, input: MemoryProposalInput): Promise<MemoryProposalRecord>
  take(bookId: string, id: string): Promise<MemoryProposalRecord>
  reject(bookId: string, id: string): Promise<boolean>
}

export function createMemoryProposalStore(dataDir: string): MemoryProposalStore {
  async function list(bookId: string): Promise<MemoryProposalRecord[]> {
    const dir = proposalDir(dataDir, bookId)
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const proposals: MemoryProposalRecord[] = []
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const value = await readJson<MemoryProposalRecord | null>(join(dir, entry.name), null).catch(() => null)
      if (valid(value) && value.bookId === bookId) proposals.push(value)
    }
    return proposals.sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_PROPOSALS)
  }

  async function create(bookId: string, input: MemoryProposalInput): Promise<MemoryProposalRecord> {
    const id = assertBookId(bookId)
    if (input.scope !== 'book' && input.scope !== 'reader') {
      throw new MemoryProposalError('invalid-proposal', '记忆范围必须是 book 或 reader')
    }
    if (input.mode !== 'append' && input.mode !== 'replace') {
      throw new MemoryProposalError('invalid-proposal', '记忆更新方式必须是 append 或 replace')
    }
    const text = typeof input.text === 'string' ? input.text.trim() : ''
    const preview = typeof input.preview === 'string' ? input.preview : ''
    if (!text || text.length > MAX_TEXT) throw new MemoryProposalError('invalid-proposal', '记忆提议内容不合法')
    const existing = await list(id)
    if (existing.length >= MAX_PROPOSALS) throw new MemoryProposalError('too-many-proposals', '待确认的记忆提议过多')
    const record: MemoryProposalRecord = {
      id: `memory-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
      bookId: id,
      scope: input.scope,
      mode: input.mode,
      text,
      preview,
      createdAt: Date.now(),
    }
    const dir = proposalDir(dataDir, id)
    await mkdir(dir, { recursive: true })
    await writeJson(proposalPath(dataDir, id, record.id), record)
    return record
  }

  async function take(bookId: string, id: string): Promise<MemoryProposalRecord> {
    const path = proposalPath(dataDir, bookId, id)
    const record = await readJson<MemoryProposalRecord | null>(path, null).catch(() => null)
    if (!valid(record) || record.bookId !== bookId) {
      throw new MemoryProposalError('proposal-not-found', '记忆提议不存在')
    }
    await rm(path, { force: true })
    return record
  }

  async function reject(bookId: string, id: string): Promise<boolean> {
    const path = proposalPath(dataDir, bookId, id)
    try {
      await readFile(path, 'utf8')
    } catch {
      return false
    }
    await rm(path, { force: true })
    return true
  }

  return { list, create, take, reject }
}
