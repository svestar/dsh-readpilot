import { React } from '../runtime.ts'
import {
  PAGE_GAP,
  clampPageIndex,
  columnsFor,
  measurePageMetrics,
  pageBounds,
} from '../paging.ts'
import type { PageLayout } from '../paging.ts'
import type { MutableRef, Screen, SelectChapter } from '../types.ts'

const WHEEL_THRESHOLD = 40

export interface TextPagerOptions {
  enabled: boolean
  layout: PageLayout
  screen: Screen
  fontSize: number
  pageWidth?: number
  selectChapter: SelectChapter
}

export interface TextPager {
  frameRef: MutableRef<HTMLDivElement | null>
  innerRef: MutableRef<HTMLDivElement | null>
  innerStyle: Record<string, string | number>
  page: number
  pageCount: number
  pageStart: number
  pageEnd: number
  pageTotal: number
  canPrev: boolean
  canNext: boolean
  goPage: (delta: number) => void
}

export function useTextPager({ enabled, layout, screen, fontSize, pageWidth = 0, selectChapter }: TextPagerOptions): TextPager {
  const [page, setPage] = React.useState(0)
  const [pageCount, setPageCount] = React.useState(1)
  const [pageTotal, setPageTotal] = React.useState(1)
  const [stride, setStride] = React.useState(0)
  const frameRef = React.useRef<HTMLDivElement | null>(null)
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const pendingLastRef = React.useRef<string | null>(null)
  const pageRef = React.useRef(0)
  const scrollPageRef = React.useRef<number | null>(null)
  pageRef.current = page

  const active = enabled && screen.kind === 'book'
  const chapterId = screen.kind === 'book' ? screen.content.chapterId : ''
  const bookId = screen.kind === 'book' ? screen.detail.book.id : ''
  const toc = screen.kind === 'book' ? screen.detail.toc : []
  const chapterIndex = toc.findIndex(item => item.id === chapterId)
  const prevChapter = chapterIndex > 0 ? toc[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex + 1 < toc.length ? toc[chapterIndex + 1] : null

  React.useEffect(() => {
    if (!active) {
      pendingLastRef.current = null
      return
    }
    setPage(0)
    const inner = innerRef.current
    if (inner) inner.scrollLeft = 0
  }, [active, chapterId, layout])

  React.useEffect(() => {
    if (pendingLastRef.current !== null && pendingLastRef.current !== chapterId) {
      pendingLastRef.current = null
    }
  }, [chapterId])

  React.useEffect(() => {
    if (!active) {
      setStride(0)
      setPageCount(1)
      setPageTotal(1)
      return
    }
    const inner = innerRef.current
    if (!inner) return
    let rafId = 0

    const measure = () => {
      rafId = 0
      if (!inner.isConnected) return
      const width = inner.clientWidth
      const height = inner.clientHeight
      const content = inner.scrollWidth
      if (width <= 0 || height <= 0) return
      const metrics = measurePageMetrics(width, content, layout, PAGE_GAP)
      const pendingLast = pendingLastRef.current === chapterId
      if (pendingLast) pendingLastRef.current = null
      setStride(metrics.stride)
      setPageCount(metrics.pageCount)
      setPageTotal(metrics.totalColumns)
      if (pendingLast) {
        setPage(metrics.pageCount - 1)
      } else {
        setPage(previous => clampPageIndex(previous, metrics.pageCount))
      }
    }

    const schedule = () => {
      if (rafId) return
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(measure)
        return
      }
      measure()
    }

    const view = typeof window === 'undefined' ? null : window
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule)
      observer.observe(inner)
    }
    view?.addEventListener('resize', schedule)
    schedule()
    // A restored panel may measure before the page width settles; retry so the
    // page count does not stick at 1 when the frame shrinks to the A4 column.
    const timers = [80, 240, 600, 1200].map(delay => view?.setTimeout(schedule, delay))

    return () => {
      if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
      observer?.disconnect()
      view?.removeEventListener('resize', schedule)
      for (const timer of timers) {
        if (timer !== undefined) view?.clearTimeout(timer)
      }
    }
  }, [active, chapterId, fontSize, layout, pageWidth])

  React.useEffect(() => {
    const fromScroll = scrollPageRef.current === page
    scrollPageRef.current = null
    if (!active) return
    const inner = innerRef.current
    if (!inner) return
    // Re-snapping a scroll-driven change would cancel a smooth scrollIntoView jump.
    if (fromScroll) return
    const maxLeft = Math.max(0, inner.scrollWidth - inner.clientWidth)
    const left = Math.min(clampPageIndex(page, pageCount) * stride, maxLeft)
    if (Math.abs(inner.scrollLeft - left) > 1) inner.scrollLeft = left
  }, [active, page, pageCount, stride])

  React.useEffect(() => {
    if (!active || stride <= 0) return
    const inner = innerRef.current
    if (!inner) return
    const onScroll = () => {
      const current = clampPageIndex(pageRef.current, pageCount)
      const maxLeft = Math.max(0, inner.scrollWidth - inner.clientWidth)
      const snapped = Math.min(current * stride, maxLeft)
      // Ignore the scroll event produced by this hook's own page write.
      if (Math.abs(inner.scrollLeft - snapped) <= 1) return
      const next = clampPageIndex(Math.round(inner.scrollLeft / stride), pageCount)
      if (next === current) return
      scrollPageRef.current = next
      setPage(next)
    }
    inner.addEventListener('scroll', onScroll)
    return () => inner.removeEventListener('scroll', onScroll)
  }, [active, pageCount, stride])

  const goPage = React.useCallback((delta: number) => {
    if (!active || delta === 0) return
    const direction = delta > 0 ? 1 : -1
    const current = clampPageIndex(page, pageCount)
    const target = current + direction
    if (target >= 0 && target < pageCount) {
      setPage(target)
      return
    }
    const neighbour = direction > 0 ? nextChapter : prevChapter
    if (!neighbour) return
    if (direction < 0) pendingLastRef.current = neighbour.id
    void selectChapter(bookId, neighbour.id)
  }, [active, bookId, nextChapter, page, pageCount, prevChapter, selectChapter])

  React.useEffect(() => {
    if (!enabled) return
    const frame = frameRef.current
    if (!frame) return
    let accumulated = 0
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      accumulated += event.deltaY
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return
      const direction = accumulated > 0 ? 1 : -1
      accumulated = 0
      goPage(direction)
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [enabled, goPage])

  const innerStyle = React.useMemo<Record<string, string | number>>(() => ({
    height: '100%',
    width: '100%',
    maxWidth: 'none',
    margin: '0',
    overflow: 'hidden',
    columnCount: columnsFor(layout),
    columnGap: `${PAGE_GAP}px`,
    columnFill: 'auto',
  }), [layout])

  const safePage = active ? clampPageIndex(page, pageCount) : 0
  const count = active ? pageCount : 1
  const total = active ? pageTotal : 1
  const bounds = pageBounds(safePage, layout, total)
  const canPrev = active && (safePage > 0 || prevChapter !== null)
  const canNext = active && (safePage < count - 1 || nextChapter !== null)

  return {
    frameRef,
    innerRef,
    innerStyle,
    page: safePage,
    pageCount: count,
    pageStart: bounds.start,
    pageEnd: bounds.end,
    pageTotal: total,
    canPrev,
    canNext,
    goPage,
  }
}
