import { React, h } from '../../runtime.ts'
import { formatSize } from '../../lib/helpers.ts'
import type { ClientBook, TextFn } from '../../lib/types.ts'

function statusLabel(t: TextFn, status: string | null): string {
  if (status === 'want') return t('statusWant')
  if (status === 'reading') return t('statusReading')
  if (status === 'done') return t('statusDone')
  return ''
}

interface BookCardProps {
  t: TextFn
  book: ClientBook
  tags: string[]
  status: string | null
  rating: number
  showCover: boolean
  onOpen: (book: ClientBook) => void
  onEditTags: (book: ClientBook) => void
}

export function BookCard({ t, book, tags, status, rating, showCover, onOpen, onEditTags }: BookCardProps) {
  const label = statusLabel(t, status)
  const supportsCover = book.format === 'epub' || book.format === 'pdf'
  const [coverState, setCoverState] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const showImage = showCover && supportsCover && coverState !== 'error'
  return h('div', {
    className: 'dsh-readpilot-book-card',
    'data-format': book.format,
  },
  h('button', {
    type: 'button',
    className: 'dsh-readpilot-book-open',
    onClick: () => onOpen(book),
  },
  h('div', { className: 'dsh-readpilot-book-cover', 'data-cover': coverState },
    !showImage
      ? h('div', { className: 'dsh-readpilot-book-cover-fallback' },
        h('span', { className: 'dsh-readpilot-book-format' }, book.format.toUpperCase()),
        h('span', { className: 'dsh-readpilot-book-cover-title' }, book.title))
      : h('img', {
        className: 'dsh-readpilot-book-cover-img',
        src: `/api/dsh-readpilot/cover?bookId=${encodeURIComponent(book.id)}&v=${Math.floor(book.mtimeMs)}`,
        alt: '',
        loading: 'lazy',
        decoding: 'async',
        onLoad: () => setCoverState('ready'),
        onError: () => setCoverState('error'),
      }),
    showCover && supportsCover && coverState === 'loading'
      ? h('span', {
        className: 'dsh-readpilot-book-cover-spinner',
        role: 'status',
        'aria-label': t('loading'),
      })
      : null),
  h('div', { className: 'dsh-readpilot-book-info' },
    h('div', { className: 'dsh-readpilot-book-title' }, book.title),
    book.duplicateOf
      ? h('span', { className: 'dsh-readpilot-book-duplicate' }, t('duplicateBadge'))
      : null,
    h('div', { className: 'dsh-readpilot-book-meta' },
      h('span', { className: 'dsh-readpilot-book-format-chip' }, book.format.toUpperCase()),
      h('span', null, formatSize(book.size)),
      h('span', { className: 'dsh-readpilot-book-progress' }, book.progress ? book.progress.chapterTitle || t('reading') : t('unread'))),
    label || rating > 0
      ? h('div', { className: 'dsh-readpilot-book-badges' },
        label ? h('span', { className: 'dsh-readpilot-book-status', 'data-status': status ?? '' }, label) : null,
        rating > 0 ? h('span', { className: 'dsh-readpilot-book-rating', title: `${rating}/5` }, '★'.repeat(rating)) : null)
      : null,
    tags.length > 0
      ? h('div', { className: 'dsh-readpilot-book-tags' },
        tags.slice(0, 3).map(tag => h('span', { key: tag, className: 'dsh-readpilot-book-tag' }, tag)),
        tags.length > 3 ? h('span', { className: 'dsh-readpilot-book-tag' }, `+${tags.length - 3}`) : null)
      : null)),
  h('div', { className: 'dsh-readpilot-book-actions' },
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-book-tag-edit',
      title: t('editTags'),
      onClick: () => onEditTags(book),
    }, t('tags'))))
}

export { statusLabel }
