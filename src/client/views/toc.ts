import { React, h } from '../runtime.ts'
import type { BookDetail, TextFn } from '../types.ts'

interface TocProps {
  t: TextFn
  detail: BookDetail
  activeChapter: string
  onSelect: (chapterId: string) => void
}

interface TocRow {
  id: string
  title: string
  chars?: number
  page?: number
  href?: string
  chapterId?: string
  level?: number
}

export function Toc({ t, detail, activeChapter, onSelect }: TocProps) {
  const outline = detail.book.format === 'pdf' && Array.isArray(detail.outline) && detail.outline.length > 0
    ? detail.outline
    : null
  const items = (outline ?? detail.toc) as TocRow[]
  const index = React.useMemo(() => {
    const chapterPage = new Map<string, number>()
    const chapterByPage = new Map<number, string>()
    for (const item of detail.toc) {
      if (typeof item.page !== 'number') continue
      if (!chapterPage.has(item.id)) chapterPage.set(item.id, item.page)
      if (!chapterByPage.has(item.page)) chapterByPage.set(item.page, item.id)
    }
    return { chapterPage, chapterByPage }
  }, [detail.toc])
  const activePage = index.chapterPage.get(activeChapter)
  return h('aside', { className: 'dsh-readpilot-toc' },
    h('div', { className: 'dsh-readpilot-toc-title' }, t('toc')),
    items.length === 0
      ? h('div', { className: 'dsh-readpilot-muted' }, t('noToc'))
      : h('div', { className: 'dsh-readpilot-toc-list' },
        items.map(item => {
          const chapterId = outline
            ? item.chapterId ?? (typeof item.page === 'number' ? index.chapterByPage.get(item.page) : undefined)
            : item.id
          const active = outline
            ? item.chapterId === activeChapter || item.page === activePage
            : item.id === activeChapter
          return h('button', {
            key: item.id,
            type: 'button',
            className: 'dsh-readpilot-toc-item',
            'data-active': active ? 'true' : 'false',
            'data-level': item.level ?? 0,
            disabled: !chapterId,
            style: outline ? { paddingLeft: `${10 + (item.level ?? 0) * 14}px` } : undefined,
            onClick: () => chapterId && onSelect(chapterId),
          }, item.title)
        })))
}
