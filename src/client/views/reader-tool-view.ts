import { formatSize } from '../helpers.ts'
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
