import { React, h, useVirtualizer } from '../runtime.ts'
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

function PlainTocList({ items, renderRow }: { items: TocRow[]; renderRow: (item: TocRow, index: number) => any }) {
  return h('div', { className: 'dsh-readpilot-toc-list' }, items.map(renderRow))
}

function VirtualTocList({ items, renderRow }: { items: TocRow[]; renderRow: (item: TocRow, index: number) => any }) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 34,
    overscan: 8,
  })
  return h('div', { ref: scrollRef, className: 'dsh-readpilot-toc-virtual' },
    h('div', {
      className: 'dsh-readpilot-toc-virtual-inner',
      style: { height: `${virtualizer.getTotalSize()}px`, position: 'relative' },
    },
    virtualizer.getVirtualItems().map((row: any) => {
      const item = items[row.index]
      return h('div', {
        key: item.id,
        ref: virtualizer.measureElement,
        'data-index': row.index,
        className: 'dsh-readpilot-toc-virtual-row',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${row.start}px)`,
        },
      }, renderRow(item, row.index))
    })))
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
  const renderRow = (item: TocRow, rowIndex: number) => {
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
      'data-index': rowIndex,
      disabled: !chapterId,
      style: outline ? { paddingLeft: `${10 + (item.level ?? 0) * 14}px` } : undefined,
      onClick: () => chapterId && onSelect(chapterId),
    }, item.title)
  }
  const virtual = typeof useVirtualizer === 'function'
  return h('aside', {
    className: 'dsh-readpilot-toc',
    'data-virtual': virtual ? 'true' : 'false',
  },
  h('div', { className: 'dsh-readpilot-toc-title' }, t('toc')),
  items.length === 0
    ? h('div', { className: 'dsh-readpilot-muted' }, t('noToc'))
    : virtual
      ? h(VirtualTocList, { items, renderRow })
      : h(PlainTocList, { items, renderRow }))
}
