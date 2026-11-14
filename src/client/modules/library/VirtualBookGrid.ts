import { React, h, useVirtualizer } from '../../runtime.ts'
import type { ClientBook } from '../../lib/types.ts'

function VirtualBookGrid({ items, renderCard }: {
  items: ClientBook[]
  renderCard: (book: ClientBook) => any
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const update = () => setWidth(element.clientWidth)
    update()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const gap = 12
  const columns = Math.max(1, Math.floor((Math.max(0, width) + gap) / (158 + gap)))
  const rows = Math.ceil(items.length / columns)
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 236,
    overscan: 2,
  })
  return h('div', { ref: scrollRef, className: 'dsh-readpilot-grid-virtual' },
    h('div', { className: 'dsh-readpilot-grid-virtual-inner', style: { height: `${virtualizer.getTotalSize()}px` } },
      virtualizer.getVirtualItems().map((row: any) => {
        const start = row.index * columns
        return h('div', {
          key: row.key,
          ref: virtualizer.measureElement,
          'data-index': row.index,
          className: 'dsh-readpilot-grid-row',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            display: 'grid',
            transform: `translateY(${row.start}px)`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: `${gap}px`,
          },
        }, items.slice(start, start + columns).map(renderCard))
      })))
}

export { VirtualBookGrid }
