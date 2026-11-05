import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { enqueueWrite } from './write-queue.ts'

const MAX_TAGS = 20
const MAX_TAG_LENGTH = 24

export type TagMap = Record<string, string[]>
export type ReadStatus = 'want' | 'reading' | 'done'
export type StatusMap = Record<string, ReadStatus>
export type RatingMap = Record<string, number>

export interface LibraryMeta {
  tags: TagMap
  status: StatusMap
  rating: RatingMap
}

export interface LibraryMetaStore {
  list(): Promise<LibraryMeta>
  setTags(bookId: string, tags: unknown): Promise<string[]>
  setStatus(bookId: string, status: unknown): Promise<ReadStatus | null>
  setRating(bookId: string, rating: unknown): Promise<number | null>
}

function normalizeBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
  return bookId
}

function normalizeTag(value: unknown): string {
  if (typeof value !== 'string') throw new Error('标签必须是字符串')
  const tag = value.replace(/\s+/g, ' ').trim()
  if (!tag) throw new Error('标签不能为空')
  if (tag.length > MAX_TAG_LENGTH) throw new Error(`标签不能超过 ${MAX_TAG_LENGTH} 个字符`)
  return tag
}

export function normalizeTags(values: unknown): string[] {
  if (!Array.isArray(values)) throw new Error('标签必须是数组')
  const tags: string[] = []
  for (const value of values) {
    const tag = normalizeTag(value)
    if (!tags.includes(tag)) tags.push(tag)
  }
  if (tags.length > MAX_TAGS) throw new Error(`每本书最多 ${MAX_TAGS} 个标签`)
  return tags
}

/** `null` clears the status; anything else must be one of the three states. */
export function normalizeReadStatus(value: unknown): ReadStatus | null {
  if (value === null || value === undefined || value === '') return null
  if (value === 'want' || value === 'reading' || value === 'done') return value
  throw new Error('阅读状态必须是 want、reading 或 done')
}

/** `null` clears the rating; otherwise it must be an integer from 1 to 5. */
export function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const rating = Number(value)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('评分必须是 1–5 的整数')
  }
  return rating
}

function readTags(value: unknown): TagMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const tags: TagMap = {}
  for (const [bookId, list] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(bookId) || !Array.isArray(list)) continue
    try {
      const normalized = normalizeTags(list)
      if (normalized.length > 0) tags[bookId] = normalized
    } catch {
      // Ignore invalid entries; the rest of the library stays usable.
    }
  }
  return tags
}

function readStatus(value: unknown): StatusMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const status: StatusMap = {}
  for (const [bookId, raw] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) continue
    const normalized = normalizeReadStatus(raw)
    if (normalized) status[bookId] = normalized
  }
  return status
}

function readRating(value: unknown): RatingMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const rating: RatingMap = {}
  for (const [bookId, raw] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) continue
    try {
      const normalized = normalizeRating(raw)
      if (normalized !== null) rating[bookId] = normalized
    } catch {
      // Ignore invalid entries; the rest of the library stays usable.
    }
  }
  return rating
}

export function createLibraryMetaStore(dataDir: string): LibraryMetaStore {
  const filePath = join(dataDir, 'library-meta.json')

  async function read(): Promise<LibraryMeta> {
    try {
      const parsed: any = JSON.parse(await readFile(filePath, 'utf8'))
      return {
        tags: readTags(parsed?.tags),
        status: readStatus(parsed?.status),
        rating: readRating(parsed?.rating),
      }
    } catch {
      return { tags: {}, status: {}, rating: {} }
    }
  }

  async function write(meta: LibraryMeta): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true })
    const temporary = `${filePath}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
    await rename(temporary, filePath)
  }

  return {
    list: read,
    async setTags(bookId, tags) {
      const id = normalizeBookId(bookId)
      const normalized = normalizeTags(tags)
      return enqueueWrite(filePath, async () => {
        const meta = await read()
        if (normalized.length > 0) meta.tags[id] = normalized
        else delete meta.tags[id]
        await write(meta)
        return normalized
      })
    },
    async setStatus(bookId, status) {
      const id = normalizeBookId(bookId)
      const normalized = normalizeReadStatus(status)
      return enqueueWrite(filePath, async () => {
        const meta = await read()
        if (normalized) meta.status[id] = normalized
        else delete meta.status[id]
        await write(meta)
        return normalized
      })
    },
    async setRating(bookId, rating) {
      const id = normalizeBookId(bookId)
      const normalized = normalizeRating(rating)
      return enqueueWrite(filePath, async () => {
        const meta = await read()
        if (normalized !== null) meta.rating[id] = normalized
        else delete meta.rating[id]
        await write(meta)
        return normalized
      })
    },
  }
}
