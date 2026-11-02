const SORTS = ['recent', 'title', 'size', 'added']

export function bookTags(bookId, tags) {
  const list = tags?.[bookId]
  return Array.isArray(list) ? list : []
}

export function tagCatalogue(books, tags) {
  const counts = new Map()
  for (const book of books) {
    for (const tag of bookTags(book.id, tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => left.tag.localeCompare(right.tag))
}

export function recentBooks(books, limit = 10) {
  return books
    .filter(book => Number.isFinite(book.progress?.updatedAt))
    .sort((left, right) => right.progress.updatedAt - left.progress.updatedAt)
    .slice(0, limit)
}

export function filterBooks(books, tags, options = {}) {
  const category = options.category ?? 'all'
  const query = String(options.query ?? '').trim().toLowerCase()
  const sort = SORTS.includes(options.sort) ? options.sort : 'recent'
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

export function categoryCounts(books, tags) {
  return {
    all: books.length,
    recent: books.filter(book => book.progress).length,
    unread: books.filter(book => !book.progress).length,
    reading: books.filter(book => book.progress).length,
    formats: ['txt', 'md', 'epub', 'pdf'].reduce((counts, format) => {
      counts[format] = books.filter(book => book.format === format).length
      return counts
    }, {}),
  }
}
