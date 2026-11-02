import { h } from '../runtime.js'

export function Toc({ t, detail, activeChapter, onSelect }) {
  const outline = detail.book.format === 'pdf' && Array.isArray(detail.outline) && detail.outline.length > 0
    ? detail.outline
    : null
  const items = outline ?? detail.toc
  const activePage = detail.toc.find(item => item.id === activeChapter)?.page
  return h('aside', { className: 'dsh-reader-toc' },
    h('div', { className: 'dsh-reader-toc-title' }, t('toc')),
    items.length === 0
      ? h('div', { className: 'dsh-reader-muted' }, t('noToc'))
      : h('div', { className: 'dsh-reader-toc-list' },
        items.map(item => {
          const chapterId = outline
            ? item.chapterId ?? detail.toc.find(entry => entry.page === item.page)?.id
            : item.id
          const active = outline
            ? item.chapterId === activeChapter || item.page === activePage
            : item.id === activeChapter
          return h('button', {
            key: item.id,
            type: 'button',
            className: 'dsh-reader-toc-item',
            'data-active': active ? 'true' : 'false',
            'data-level': item.level ?? 0,
            disabled: !chapterId,
            style: outline ? { paddingLeft: `${10 + (item.level ?? 0) * 14}px` } : undefined,
            onClick: () => chapterId && onSelect(chapterId),
          }, item.title)
        })))
}
