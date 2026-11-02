import { React, h } from '../runtime.js'
import { formatSize } from '../helpers.js'

export function PanelIcon({ size = 20, active }) {
  return h('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    style: { display: 'block' },
  },
  h('path', {
    d: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H11v15H6.5A2.5 2.5 0 0 0 4 21.5z',
    fill: active ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
    opacity: active ? 0.9 : 1,
  }),
  h('path', {
    d: 'M20 6.5A2.5 2.5 0 0 0 17.5 4H13v15h4.5A2.5 2.5 0 0 1 20 21.5z',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
  }),
  h('path', { d: 'M12 4v15.5', stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.55 }))
}

export function Setup({ t, initialPath, busy, onConfigure, onPick, onCancel }) {
  const [path, setPath] = React.useState(initialPath ?? '')
  const row = h('div', { className: 'dsh-reader-path-row' },
    h('input', {
      value: path,
      placeholder: t('pathPlaceholder'),
      spellCheck: false,
      onChange: event => setPath(event.target.value),
    }),
    h('button', {
      type: 'button',
      className: 'dsh-reader-secondary',
      onClick: () => onPick(setPath),
    }, t('chooseDir')))
  const actions = h('div', { className: 'dsh-reader-setup-actions' },
    h('button', {
      type: 'button',
      className: 'dsh-reader-primary',
      disabled: busy || !path.trim(),
      onClick: () => onConfigure(path.trim()),
    }, busy ? t('loading') : t('create')),
    onCancel
      ? h('button', {
        type: 'button',
        className: 'dsh-reader-secondary',
        onClick: onCancel,
      }, t('cancel'))
      : null)
  return h('div', { className: 'dsh-reader-setup' },
    h('div', { className: 'dsh-reader-setup-card' },
      h('h2', null, t('setupTitle')),
      h('p', null, t('setupHint')),
      row,
      actions))
}

export function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings }) {
  const books = snapshot.books
  return h('div', { className: 'dsh-reader-body' },
    h('div', { className: 'dsh-reader-library-head' },
      h('h2', null, `${t('library')} · ${books.length}`),
      h('div', { className: 'dsh-reader-header-actions' },
        h('button', {
          type: 'button',
          className: 'dsh-reader-secondary',
          onClick: onSettings,
        }, t('settings')),
        h('button', {
          type: 'button',
          className: 'dsh-reader-secondary',
          disabled: busy,
          onClick: onRefresh,
        }, t('rescan')))),
    books.length === 0
      ? h('div', { className: 'dsh-reader-empty' },
        h('h2', null, t('empty')),
        h('p', null, t('emptyHint')))
      : h('div', { className: 'dsh-reader-grid' },
        books.map(book => h('button', {
          key: book.id,
          type: 'button',
          className: 'dsh-reader-card',
          onClick: () => onOpen(book),
        },
        h('div', { className: 'dsh-reader-cover' }, book.format.toUpperCase()),
        h('div', { className: 'dsh-reader-card-title' }, book.title),
        h('div', { className: 'dsh-reader-card-meta' },
          h('span', null, `${formatSize(book.size)}`),
          book.supported
            ? null
            : h('span', { className: 'dsh-reader-badge' }, t('unsupported'))),
        book.progress
          ? h('div', { className: 'dsh-reader-card-meta' },
            h('span', null, book.progress.chapterTitle ?? t('reading')))
          : h('div', { className: 'dsh-reader-card-meta' }, h('span', null, t('unread')))))))
}
