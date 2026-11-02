export function bookmarkContext(screen, chapterId) {
  if (!screen || screen.kind !== 'book') return { chapterTitle: '', pageLabel: '' }
  const item = screen.detail.toc.find(entry => entry.id === chapterId)
  const fallback = screen.content?.title || item?.title || ''
  if (screen.detail.book.format !== 'pdf') {
    return { chapterTitle: fallback, pageLabel: '' }
  }
  const page = item?.page
  const outline = Array.isArray(screen.detail.outline) ? screen.detail.outline : []
  const candidates = outline
    .filter(entry => Number.isInteger(entry.page) && (!Number.isInteger(page) || entry.page <= page))
    .sort((left, right) => left.page - right.page)
  const chapterTitle = candidates.at(-1)?.title || fallback
  return {
    chapterTitle,
    pageLabel: chapterTitle === fallback ? '' : fallback,
  }
}
