import { React } from '../../runtime.ts'
import { applyPaletteToFrame } from '../../lib/preferences.ts'
import {
  PAGE_GAP,
  anchorPage,
  clampPageIndex,
  columnsFor,
  measurePageMetrics,
  pageBounds,
} from './paging.ts'
import type { PageLayout, PageMetrics, ReadingAnchor, ReaderMode } from './paging.ts'
import type { ReaderPalette } from '../../lib/preferences.ts'
import type { StateSetter } from '../../runtime.ts'
import type { Screen, Selection, SelectChapter, Visual } from '../../lib/types.ts'

const EPUB_PAGING_STYLE_ID = 'dsh-readpilot-paging'
const EPUB_WHEEL_THRESHOLD = 40

function applyEpubPagingStyle(doc: Document, layout: PageLayout): void {
  let style = doc.getElementById(EPUB_PAGING_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = EPUB_PAGING_STYLE_ID
    ;(doc.head ?? doc.documentElement).appendChild(style)
  }
  style.textContent = `html { height: 100%; column-count: ${columnsFor(layout)}; column-gap: ${PAGE_GAP}px; column-fill: auto; overflow: hidden; } body { margin: 0 !important; height: 100%; }`
}

function removeEpubPagingStyle(doc: Document | null | undefined): void {
  doc?.getElementById(EPUB_PAGING_STYLE_ID)?.remove()
}

function readyEpubDocument(frame: HTMLIFrameElement | null | undefined): Document | null {
  const doc = frame?.contentDocument
  if (!doc?.documentElement || doc.readyState === 'loading') return null
  const source = frame?.src
  if (source && doc.URL !== source) return null
  return doc
}

function measureEpubDocument(doc: Document, layout: PageLayout): PageMetrics {
  applyEpubPagingStyle(doc, layout)
  const html = doc.documentElement
  // Columns lay out at the fractional iframe width while clientWidth rounds to whole
  // pixels; the rounded width made every page drift left and clip its first characters.
  const computedWidth = doc.defaultView ? Number.parseFloat(doc.defaultView.getComputedStyle(html).width) : Number.NaN
  const width = Number.isFinite(computedWidth) && computedWidth > 0 ? computedWidth : html.clientWidth
  return measurePageMetrics(width, html.scrollWidth, layout)
}

function scrollEpubPage(frame: HTMLIFrameElement | null | undefined, page: number, stride: number): void {
  const doc = frame?.contentDocument
  if (doc) doc.documentElement.scrollLeft = page * stride
}

interface EpubPagingOptions {
  screen: Screen
  visual: Visual | null
  readingMode?: ReaderMode
  layout?: PageLayout
  anchor?: ReadingAnchor | null
  selectChapter: SelectChapter
  palette: ReaderPalette
  setSelection: StateSetter<Selection | null>
}

export function useEpubPaging({
  screen,
  visual,
  readingMode = 'paged',
  layout = 'single',
  anchor,
  selectChapter,
  palette,
  setSelection,
}: EpubPagingOptions) {
  const appliedAnchorRef = React.useRef(0)
  const [epubReady, setEpubReady] = React.useState(0)
  const [epubPage, setEpubPage] = React.useState(0)
  const [epubPageCount, setEpubPageCount] = React.useState(1)
  const [epubPageStart, setEpubPageStart] = React.useState(1)
  const [epubPageEnd, setEpubPageEnd] = React.useState(1)
  const [epubPageTotal, setEpubPageTotal] = React.useState(1)
  const epubFrameRef = React.useRef<HTMLIFrameElement | null>(null)

  const epubCleanupRef = React.useRef<(() => void) | null>(null)
  const epubPageRef = React.useRef(0)
  const epubPageCountRef = React.useRef(1)
  const epubStrideRef = React.useRef(0)
  const epubTotalRef = React.useRef(1)
  const epubMeasuredRef = React.useRef(false)
  const epubPendingLastRef = React.useRef<string | null>(null)
  const goEpubPageRef = React.useRef<(delta: number) => void>(() => {})

  const epubHref = visual?.kind === 'epub' ? visual.href : null
  const epubChapterId = screen.kind === 'book' ? screen.content.chapterId : ''
  const epubPaged = readingMode === 'paged' && screen.kind === 'book' && visual?.kind === 'epub'

  React.useEffect(() => () => {
    epubCleanupRef.current?.()
    epubCleanupRef.current = null
  }, [visual?.kind === 'epub' ? visual.href : null])

  const onEpubLoad = React.useCallback((event: any) => {
    const frame = event.currentTarget as HTMLIFrameElement
    const doc = frame.contentDocument
    epubCleanupRef.current?.()
    epubCleanupRef.current = null
    if (!doc) return
    applyPaletteToFrame(frame, palette)
    setEpubReady(previous => previous + 1)
    const handler = () => {
      const selected = doc.getSelection()
      if (!selected) return
      const text = selected.toString().trim()
      if (!text || !selected.rangeCount) return
      const range = selected.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const frameRect = frame.getBoundingClientRect()
      setSelection({
        text: text.slice(0, 2000),
        blockIndex: 0,
        offset: 0,
        x: Math.min(Math.max(frameRect.left + rect.left + rect.width / 2, 120), window.innerWidth - 120),
        y: frameRect.top + rect.top,
      })
    }
    doc.addEventListener('mouseup', handler)
    const bump = () => setEpubReady(previous => previous + 1)
    const images = Array.from(doc.images ?? [])
    for (const image of images) {
      if (!image.complete) image.addEventListener('load', bump, { once: true })
    }
    if (doc.fonts?.ready) doc.fonts.ready.then(bump).catch(() => {})
    epubCleanupRef.current = () => {
      doc.removeEventListener('mouseup', handler)
      for (const image of images) image.removeEventListener('load', bump)
    }
  }, [palette, setSelection])

  React.useEffect(() => {
    if (visual?.kind === 'epub' && epubFrameRef.current) {
      applyPaletteToFrame(epubFrameRef.current, palette)
    }
  }, [palette, visual?.kind === 'epub' ? visual.href : null])

  const goEpubChapter = React.useCallback((delta: number) => {
    epubPendingLastRef.current = null
    if (screen.kind !== 'book') return
    const index = screen.detail.toc.findIndex(item => item.id === screen.content.chapterId)
    const next = screen.detail.toc[index + delta]
    if (next) void selectChapter(screen.detail.book.id, next.id)
  }, [screen, selectChapter])

  const resetEpubState = React.useCallback(() => {
    epubPageRef.current = 0
    epubPageCountRef.current = 1
    epubStrideRef.current = 0
    epubTotalRef.current = 1
    epubMeasuredRef.current = false
    setEpubPage(0)
    setEpubPageCount(1)
    setEpubPageStart(1)
    setEpubPageEnd(1)
    setEpubPageTotal(1)
  }, [])

  const goEpubPage = React.useCallback((delta: number) => {
    if (!epubPaged || !epubMeasuredRef.current) return
    const direction = delta > 0 ? 1 : delta < 0 ? -1 : 0
    if (!direction) return
    const next = epubPageRef.current + direction
    if (next >= 0 && next < epubPageCount) {
      epubPageRef.current = next
      setEpubPage(next)
      const total = epubTotalRef.current
      const bounds = pageBounds(next, layout, total)
      setEpubPageTotal(total)
      setEpubPageStart(bounds.start)
      setEpubPageEnd(bounds.end)
      scrollEpubPage(epubFrameRef.current, next, epubStrideRef.current)
      return
    }
    const toc = screen.kind === 'book' ? screen.detail.toc : []
    const index = toc.findIndex(item => item.id === screen.content.chapterId)
    if (direction > 0) {
      if (index < 0 || index >= toc.length - 1) return
      epubPageRef.current = 0
      epubMeasuredRef.current = false
      setEpubPage(0)
      goEpubChapter(1)
      return
    }
    if (index <= 0) return
    const previous = toc[index - 1]
    goEpubChapter(-1)
    epubMeasuredRef.current = false
    epubPendingLastRef.current = previous.id
  }, [epubPaged, epubPageCount, goEpubChapter, layout, screen])

  React.useEffect(() => {
    goEpubPageRef.current = goEpubPage
  }, [goEpubPage])

  React.useEffect(() => {
    epubPendingLastRef.current = null
    resetEpubState()
  }, [layout, readingMode, resetEpubState])

  React.useEffect(() => {
    if (!epubPaged) return
    if (epubPendingLastRef.current !== null && epubPendingLastRef.current === epubChapterId) {
      epubPageRef.current = 0
      epubMeasuredRef.current = false
      setEpubPage(0)
      return
    }
    epubPendingLastRef.current = null
    resetEpubState()
  }, [epubChapterId, epubHref, epubPaged, resetEpubState])

  React.useEffect(() => {
    const frame = epubFrameRef.current
    if (!epubPaged) {
      const doc = frame?.contentDocument
      if (doc) {
        removeEpubPagingStyle(doc)
        doc.documentElement.scrollLeft = 0
      }
      resetEpubState()
      return
    }
    if (!readyEpubDocument(frame)) return
    let animationFrame = 0
    let lastSize = ''
    const measure = () => {
      animationFrame = 0
      const doc = readyEpubDocument(frame)
      if (!doc) return
      const metrics = measureEpubDocument(doc, layout)
      lastSize = frame ? `${frame.clientWidth}x${frame.clientHeight}` : ''
      const pendingLast = epubPendingLastRef.current !== null && epubPendingLastRef.current === epubChapterId
      let page = clampPageIndex(pendingLast ? metrics.pageCount - 1 : epubPageRef.current, metrics.pageCount)
      if (anchor && anchor.chapterId === epubChapterId && anchor.token !== appliedAnchorRef.current) {
        appliedAnchorRef.current = anchor.token
        page = clampPageIndex(anchorPage(anchor.fraction, metrics.pageCount), metrics.pageCount)
      }
      epubPageRef.current = page
      epubPageCountRef.current = metrics.pageCount
      epubStrideRef.current = metrics.stride
      epubTotalRef.current = metrics.totalColumns
      epubMeasuredRef.current = true
      const bounds = pageBounds(page, layout, metrics.totalColumns)
      setEpubPage(page)
      setEpubPageCount(metrics.pageCount)
      setEpubPageTotal(metrics.totalColumns)
      setEpubPageStart(bounds.start)
      setEpubPageEnd(bounds.end)
      doc.documentElement.scrollLeft = page * metrics.stride
      if (pendingLast) epubPendingLastRef.current = null
    }
    const schedule = () => {
      if (frame && `${frame.clientWidth}x${frame.clientHeight}` === lastSize) return
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(measure)
    }
    schedule()
    let observer: ResizeObserver | null = null
    if (frame && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule)
      observer.observe(frame)
    }
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      observer?.disconnect()
    }
  }, [epubChapterId, epubHref, epubPaged, epubReady, layout, resetEpubState, anchor?.token])

  React.useEffect(() => {
    if (!epubPaged) return
    const frame = epubFrameRef.current
    if (!readyEpubDocument(frame)) return
    const doc = frame?.contentDocument
    if (!doc) return
    let accumulated = 0
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (!event.deltaY) return
      event.preventDefault()
      if ((accumulated > 0) !== (event.deltaY > 0)) accumulated = 0
      accumulated += event.deltaY
      if (Math.abs(accumulated) < EPUB_WHEEL_THRESHOLD) return
      const direction = accumulated > 0 ? 1 : -1
      accumulated = 0
      goEpubPageRef.current(direction)
    }
    doc.addEventListener('wheel', onWheel, { passive: false })
    return () => doc.removeEventListener('wheel', onWheel)
  }, [epubHref, epubPaged, epubPage, epubReady, layout])

  React.useEffect(() => {
    if (!epubPaged) return
    const frame = epubFrameRef.current
    if (!readyEpubDocument(frame)) return
    const doc = frame?.contentDocument
    if (!doc) return
    let animationFrame = 0
    const sync = () => {
      animationFrame = 0
      if (!epubMeasuredRef.current) return
      const stride = epubStrideRef.current
      if (stride <= 0) return
      const page = clampPageIndex(Math.round(doc.documentElement.scrollLeft / stride), epubPageCountRef.current)
      if (page === epubPageRef.current) return
      epubPageRef.current = page
      setEpubPage(page)
      const total = epubTotalRef.current
      const bounds = pageBounds(page, layout, total)
      setEpubPageTotal(total)
      setEpubPageStart(bounds.start)
      setEpubPageEnd(bounds.end)
    }
    const onScroll = () => {
      if (animationFrame) return
      animationFrame = requestAnimationFrame(sync)
    }
    doc.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      doc.removeEventListener('scroll', onScroll, true)
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [epubHref, epubPaged, epubReady, layout])

  React.useEffect(() => () => {
    const doc = epubFrameRef.current?.contentDocument
    if (doc) removeEpubPagingStyle(doc)
  }, [epubFrameRef])

  return {
    epubReady,
    epubFrameRef,
    epubPage,
    epubPageCount,
    epubPageStart,
    epubPageEnd,
    epubPageTotal,
    onEpubLoad,
    goEpubChapter,
    goEpubPage,
  }
}
