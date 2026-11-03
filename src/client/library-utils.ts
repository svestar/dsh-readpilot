const SORTS = ['recent', 'title', 'size', 'added']

export interface LibraryBook {
  id: string
  title: string
  format: string
  size: number
  mtimeMs: number
  progress?: { chapterTitle?: string; updatedAt?: number } | null
}

export type TagMap = Record<string, string[]>

export interface FilterOptions {
  category?: string
  query?: unknown
  sort?: string
}

export interface CategoryCounts {
  all: number
  recent: number
  unread: number
  reading: number
  formats: Record<string, number>
}

export function bookTags(bookId: string, tags: TagMap | null | undefined): string[] {
  const list = tags?.[bookId]
  return Array.isArray(list) ? list : []
}

export function tagCatalogue(books: readonly LibraryBook[], tags: TagMap | null | undefined): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const book of books) {
    for (const tag of bookTags(book.id, tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag))
}

export function recentBooks<T extends LibraryBook>(books: readonly T[], limit = 10): T[] {
  return books
    .filter(book => Number.isFinite(book.progress?.updatedAt))
    .sort((left, right) => (right.progress?.updatedAt ?? 0) - (left.progress?.updatedAt ?? 0))
    .slice(0, limit)
}

export function filterBooks<T extends LibraryBook>(
  books: readonly T[],
  tags: TagMap | null | undefined,
  options: FilterOptions = {},
): T[] {
  const category = options.category ?? 'all'
  const query = String(options.query ?? '').trim().toLowerCase()
  const sort = typeof options.sort === 'string' && SORTS.includes(options.sort) ? options.sort : 'recent'
  const filtered = books.filter(book => {
    if (category === 'recent' && !book.progress) return false
    if (category === 'unread' && book.progress) return false
    if (category === 'reading' && !book.progress) return false
    if (category.startsWith('format:') && book.format !== category.slice(7)) return false
    if (category.startsWith('tag:')) {
      const tag = category.slice(4)
      if (!bookTags(book.id, tags).includes(tag)) return false
    }
    if (!query) return true
    const searchable = `${book.title}\n${book.format}\n${bookTags(book.id, tags).join(' ')}`.toLowerCase()
    return searchable.includes(query)
  })
  const sorted = filtered.slice()
  sorted.sort((left, right) => {
    if (sort === 'title') return left.title.localeCompare(right.title)
    if (sort === 'size') return right.size - left.size
    if (sort === 'added') return right.mtimeMs - left.mtimeMs
    const leftTime = left.progress?.updatedAt ?? 0
    const rightTime = right.progress?.updatedAt ?? 0
    return rightTime - leftTime || right.mtimeMs - left.mtimeMs
  })
  return sorted
}

export function categoryCounts(books: readonly LibraryBook[], tags: TagMap | null | undefined): CategoryCounts {
  return {
    all: books.length,
    recent: books.filter(book => book.progress).length,
    unread: books.filter(book => !book.progress).length,
    reading: books.filter(book => book.progress).length,
    formats: ['txt', 'md', 'epub', 'pdf'].reduce<Record<string, number>>((counts, format) => {
      counts[format] = books.filter(book => book.format === format).length
      return counts
    }, {}),
  }
}
