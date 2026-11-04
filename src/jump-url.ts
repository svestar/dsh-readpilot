export const READER_JUMP_ORIGIN = 'https://dsh-readpilot.invalid'
export const READER_JUMP_PATH = '/jump'

export interface ReaderJumpTarget {
  bookId: string
  chapterId: string
  offset?: number
  q?: string
}

export function buildReaderJumpUrl(bookId: string, chapterId: string, offset?: number, q?: string): string {
  const params = new URLSearchParams({ book: bookId, chapter: chapterId })
  if (Number.isInteger(offset) && (offset as number) >= 0) params.set('offset', String(offset))
  if (q && q.trim()) params.set('q', q.trim())
  return `${READER_JUMP_ORIGIN}${READER_JUMP_PATH}?${params.toString()}`
}

export function parseReaderJumpUrl(value: string): ReaderJumpTarget | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.origin !== READER_JUMP_ORIGIN || url.pathname !== READER_JUMP_PATH) return null
  const bookId = url.searchParams.get('book')
  const chapterId = url.searchParams.get('chapter')
  if (!bookId || !chapterId) return null
  const rawOffset = url.searchParams.get('offset')
  const offset = rawOffset != null && /^\d+$/.test(rawOffset) ? Number(rawOffset) : undefined
  const q = url.searchParams.get('q') || undefined
  return { bookId, chapterId, ...(offset === undefined ? {} : { offset }), ...(q ? { q } : {}) }
}
