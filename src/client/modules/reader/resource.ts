export interface ReaderResourceTarget {
  bookId: string
  chapterId?: string
  offset?: number
}

const RESOURCE_PREFIX = 'dsh-resource://dsh-readpilot/book/'

export function buildReaderResource(bookId: string, chapterId?: string | null, offset?: number | null): string {
  const base = `${RESOURCE_PREFIX}${encodeURIComponent(bookId)}`
  const query = new URLSearchParams()
  if (chapterId) query.set('chapter', chapterId)
  if (typeof offset === 'number' && Number.isInteger(offset) && offset >= 0) query.set('offset', String(offset))
  const suffix = query.toString()
  return suffix ? `${base}?${suffix}` : base
}

export function parseReaderResource(address: unknown): ReaderResourceTarget | null {
  if (typeof address !== 'string' || !address.startsWith(RESOURCE_PREFIX)) return null
  const rest = address.slice(RESOURCE_PREFIX.length)
  const queryAt = rest.indexOf('?')
  const rawId = queryAt === -1 ? rest : rest.slice(0, queryAt)
  let bookId: string
  try {
    bookId = decodeURIComponent(rawId)
  } catch {
    return null
  }
  if (!bookId) return null
  const query = new URLSearchParams(queryAt === -1 ? '' : rest.slice(queryAt + 1))
  const chapterId = query.get('chapter') || undefined
  const rawOffset = query.get('offset')
  const offset = rawOffset !== null && /^\d+$/.test(rawOffset) ? Number(rawOffset) : undefined
  return {
    bookId,
    ...(chapterId ? { chapterId } : {}),
    ...(offset !== undefined ? { offset } : {}),
  }
}
