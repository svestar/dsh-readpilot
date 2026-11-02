import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const MAX_TAGS = 20
const MAX_TAG_LENGTH = 24

function normalizeBookId(bookId) {
  if (typeof bookId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
  return bookId
}

function normalizeTag(value) {
  if (typeof value !== 'string') throw new Error('标签必须是字符串')
  const tag = value.replace(/\s+/g, ' ').trim()
  if (!tag) throw new Error('标签不能为空')
  if (tag.length > MAX_TAG_LENGTH) throw new Error(`标签不能超过 ${MAX_TAG_LENGTH} 个字符`)
  return tag
}

export function normalizeTags(values) {
  if (!Array.isArray(values)) throw new Error('标签必须是数组')
  const tags = []
  for (const value of values) {
    const tag = normalizeTag(value)
    if (!tags.includes(tag)) tags.push(tag)
  }
  if (tags.length > MAX_TAGS) throw new Error(`每本书最多 ${MAX_TAGS} 个标签`)
  return tags
}

function readTags(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const tags = {}
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

export function createLibraryMetaStore(dataDir) {
  const filePath = join(dataDir, 'library-meta.json')

  async function read() {
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'))
      return { tags: readTags(parsed?.tags) }
    } catch {
      return { tags: {} }
    }
  }

  async function write(meta) {
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
      const meta = await read()
      if (normalized.length > 0) meta.tags[id] = normalized
      else delete meta.tags[id]
      await write(meta)
      return normalized
    },
  }
}
