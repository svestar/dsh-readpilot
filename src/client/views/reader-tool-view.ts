import { formatSize } from '../helpers.ts'
import { buildReaderResource } from '../reader-resource.ts'
import { h } from '../runtime.ts'
import type { TextFn } from '../types.ts'

export interface ReaderBookSummary {
  id: string
  title: string
  format: string
  size: number
  progress: string
}

export interface ReaderBooksView {
  books: ReaderBookSummary[]
}

/** First-party tool views read the single text block of a settled result. */
export function readerToolResultText(block: any): string | null {
  if (!block || !Array.isArray(block.content) || block.content.length !== 1) return null
  const only = block.content[0]
  return only?.type === 'text' && typeof only.text === 'string' ? only.text : null
}

export function parseReaderBooksResult(text: string | null | undefined): ReaderBooksView | null {
  if (!text) return null
  let value: any
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!value || !Array.isArray(value.books)) return null
  const books = value.books
    .map((book: any): ReaderBookSummary => ({
      id: typeof book?.id === 'string' ? book.id : '',
      title: typeof book?.title === 'string' ? book.title : '',
      format: typeof book?.format === 'string' ? book.format : '',
      size: Number.isFinite(book?.size) ? Number(book.size) : 0,
      progress: typeof book?.progress?.chapterTitle === 'string' ? book.progress.chapterTitle : '',
    }))
    .filter((book: ReaderBookSummary) => book.title)
  return { books }
}

export interface ReaderSearchMatch {
  bookId: string
  bookTitle: string
  chapterId: string
  chapterTitle: string
  offset: number
  snippet: string
}

export interface ReaderSearchView {
  matches: ReaderSearchMatch[]
  truncated: boolean
}

export function parseReaderSearchResult(text: string | null | undefined): ReaderSearchView | null {
  if (!text) return null
  let value: any
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!value || !Array.isArray(value.matches)) return null
  const matches = value.matches
    .map((match: any): ReaderSearchMatch => ({
      bookId: typeof match?.bookId === 'string' ? match.bookId : '',
      bookTitle: typeof match?.bookTitle === 'string' ? match.bookTitle : '',
      chapterId: typeof match?.chapterId === 'string' ? match.chapterId : '',
      chapterTitle: typeof match?.chapterTitle === 'string' ? match.chapterTitle : '',
      offset: Number.isFinite(match?.offset) ? Number(match.offset) : 0,
      snippet: typeof match?.snippet === 'string' ? match.snippet : '',
    }))
    .filter((match: ReaderSearchMatch) => match.bookId && match.chapterId)
  return { matches, truncated: value.truncated === true }
}

export function ReaderSearchToolView({ t, phase, block, onOpen }: {
  t: TextFn
  phase?: string
  block?: any
  onOpen?: (address: string) => void
}) {
  if (phase !== 'result') {
    return h('div', { className: 'dsh-readpilot-tool-card' },
      h('div', { className: 'dsh-readpilot-tool-card-pending' }, t('loading')))
  }
  const text = readerToolResultText(block)
  if (!text) return null
  const data = parseReaderSearchResult(text)
  if (!data) {
    return h('pre', { className: 'dsh-readpilot-tool-card-raw' }, text.slice(0, 4000))
  }
  return h('div', { className: 'dsh-readpilot-tool-card' },
    h('div', { className: 'dsh-readpilot-tool-card-title' },
      `${t('search')} · ${data.matches.length}${data.truncated ? '…' : ''}`),
    h('div', { className: 'dsh-readpilot-tool-card-list' },
      data.matches.slice(0, 6).map((match, index) => h('div', {
        key: `${match.bookId}:${match.chapterId}:${match.offset}:${index}`,
        className: 'dsh-readpilot-tool-card-match',
      },
      h('div', { className: 'dsh-readpilot-tool-card-main' },
        h('div', { className: 'dsh-readpilot-tool-card-name' },
          `${match.bookTitle} · ${match.chapterTitle}`),
        h('div', { className: 'dsh-readpilot-tool-card-snippet' }, match.snippet)),
      onOpen
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-tool-card-open',
          onClick: () => onOpen(buildReaderResource(match.bookId, match.chapterId, match.offset)),
        }, t('jump'))
        : null))),
    data.matches.length > 6
      ? h('div', { className: 'dsh-readpilot-tool-card-more' }, `+${data.matches.length - 6}`)
      : null)
}

export interface ReaderOpenView {
  bookId: string
  title: string
  author: string
  toc: Array<{ id: string; title: string }>
  tocTruncated: boolean
}

export function parseReaderOpenResult(text: string | null | undefined): ReaderOpenView | null {
  if (!text) return null
  let value: any
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!value || typeof value.bookId !== 'string' || !Array.isArray(value.toc)) return null
  return {
    bookId: value.bookId,
    title: typeof value.title === 'string' ? value.title : '',
    author: typeof value.author === 'string' ? value.author : '',
    toc: value.toc
      .filter((item: any) => typeof item?.id === 'string' && typeof item?.title === 'string')
      .map((item: any) => ({ id: item.id, title: item.title })),
    tocTruncated: value.tocTruncated === true,
  }
}

export function ReaderOpenToolView({ t, phase, block, onOpen }: {
  t: TextFn
  phase?: string
  block?: any
  onOpen?: (address: string) => void
}) {
  if (phase !== 'result') {
    return h('div', { className: 'dsh-readpilot-tool-card' },
      h('div', { className: 'dsh-readpilot-tool-card-pending' }, t('loading')))
  }
  const text = readerToolResultText(block)
  if (!text) return null
  const data = parseReaderOpenResult(text)
  if (!data) {
    return h('pre', { className: 'dsh-readpilot-tool-card-raw' }, text.slice(0, 4000))
  }
  return h('div', { className: 'dsh-readpilot-tool-card' },
    h('div', { className: 'dsh-readpilot-tool-card-match' },
      h('div', { className: 'dsh-readpilot-tool-card-main' },
        h('div', { className: 'dsh-readpilot-tool-card-name' }, data.title || data.bookId),
        h('div', { className: 'dsh-readpilot-tool-card-snippet' },
          [data.author, `${data.toc.length}${data.tocTruncated ? '+' : ''}`].filter(Boolean).join(' · '))),
      onOpen
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-tool-card-open',
          onClick: () => onOpen(buildReaderResource(data.bookId, data.toc[0]?.id)),
        }, t('jump'))
        : null),
    data.toc.length > 0
      ? h('div', { className: 'dsh-readpilot-tool-card-list' },
        data.toc.slice(0, 6).map((chapter, index) => h('div', {
          key: `${chapter.id}:${index}`,
          className: 'dsh-readpilot-tool-card-row',
        },
        h('span', { className: 'dsh-readpilot-tool-card-name', title: chapter.title }, chapter.title))))
      : null,
    data.toc.length > 6
      ? h('div', { className: 'dsh-readpilot-tool-card-more' }, `+${data.toc.length - 6}`)
      : null)
}

export function ReaderBooksToolView({ t, phase, block }: { t: TextFn; phase?: string; block?: any }) {
  if (phase !== 'result') {
    return h('div', { className: 'dsh-readpilot-tool-card' },
      h('div', { className: 'dsh-readpilot-tool-card-pending' }, t('loading')))
  }
  const text = readerToolResultText(block)
  if (!text) return null
  const data = parseReaderBooksResult(text)
  if (!data) {
    return h('pre', { className: 'dsh-readpilot-tool-card-raw' }, text.slice(0, 4000))
  }
  return h('div', { className: 'dsh-readpilot-tool-card' },
    h('div', { className: 'dsh-readpilot-tool-card-title' }, `${t('library')} · ${data.books.length}`),
    h('div', { className: 'dsh-readpilot-tool-card-list' },
      data.books.slice(0, 8).map((book, index) => h('div', {
        key: `${book.id}:${index}`,
        className: 'dsh-readpilot-tool-card-row',
      },
      h('span', { className: 'dsh-readpilot-tool-card-name', title: book.title }, book.title),
      h('span', { className: 'dsh-readpilot-tool-card-meta' },
        [book.format.toUpperCase(), book.size ? formatSize(book.size) : '', book.progress].filter(Boolean).join(' · '))))),
    data.books.length > 8
      ? h('div', { className: 'dsh-readpilot-tool-card-more' }, `+${data.books.length - 8}`)
      : null)
}
