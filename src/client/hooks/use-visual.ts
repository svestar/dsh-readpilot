import { React } from '../runtime.ts'
import { applyPaletteToFrame, messageOf } from '../helpers.ts'
import type { ReaderPalette } from '../helpers.ts'
import type { StateSetter } from '../runtime.ts'
import {
  PAGE_GAP,
  clampPageIndex,
  columnsFor,
  measurePageMetrics,
  pageBounds,
  pageStep,
} from '../paging.ts'
import type { PageLayout, PageMetrics, ReaderMode } from '../paging.ts'
import type { CallRpc, PageView, Screen, Selection, SelectChapter, TextFn, Visual } from '../types.ts'

interface VisualOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  palette: ReaderPalette
  setSelection: StateSetter<Selection | null>
  selectChapter: SelectChapter
  readingMode?: ReaderMode
  layout?: PageLayout
}

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
  return measurePageMetrics(html.clientWidth, html.scrollWidth, layout)
}

function scrollEpubPage(frame: HTMLIFrameElement | null | undefined, page: number, stride: number): void {
  const doc = frame?.contentDocument
  if (doc) doc.documentElement.scrollLeft = page * stride
}

export function useVisual({
  call,
  t,
  screen,
  palette,
  setSelection,
  selectChapter,
  readingMode = 'paged',
  layout = 'single',
}: VisualOptions) {
  const [visual, setVisual] = React.useState<Visual | null>(null)
  const [pageView, setPageView] = React.useState<PageView | null>(null)
  const [pageViews, setPageViews] = React.useState<PageView[]>([])
  const [loadedView, setLoadedView] = React.useState<{ bookId: string; page: number } | null>(null)
  const [pdfPageCount, setPdfPageCount] = React.useState(0)
  const [pageInput, setPageInput] = React.useState('1')
  const [visualLoading, setVisualLoading] = React.useState(false)
  const [visualError, setVisualError] = React.useState('')
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
  const activeChapterId = screen.kind === 'book'
    ? (visual?.kind === 'pdf'
      ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
      : screen.content.chapterId)
    : ''
  const epubHref = visual?.kind === 'epub' ? visual.href : null
  const epubChapterId = screen.kind === 'book' ? screen.content.chapterId : ''
  const epubPaged = readingMode === 'paged' && screen.kind === 'book' && visual?.kind === 'epub'

  React.useEffect(() => {
    if (!visual || visual.kind !== 'pdf' || screen.kind !== 'book') {
      setPageView(null)
      setPageViews([])
      setPdfPageCount(0)
      setLoadedView(null)
      return
    }
    let cancelled = false
    setVisualLoading(true)
    setVisualError('')
    const bookId = screen.detail.book.id
    const page = visual.page
    const scale = visual.scale
    const double = layout === 'double'
    const load = async () => {
      const first = await call('pageView', { bookId, page, scale })
      if (cancelled) return
      let views: PageView[] = [first]
      if (double && page < first.pageCount) {
        const second = await call('pageView', { bookId, page: page + 1, scale })
        if (cancelled) return
        views = [first, second]
      }
      setPageViews(views)
      setPageView(first)
      setPdfPageCount(first.pageCount)
      setPageInput(String(page))
      setLoadedView({ bookId, page })
    }
    void load()
      .catch((cause: unknown) => {
        if (cancelled) return
        setPageView(null)
        setPageViews([])
        setPdfPageCount(0)
        setLoadedView(null)
        setVisualError(`${t('loadFailed')}：${messageOf(cause)}`)
      })
      .finally(() => {
        if (!cancelled) setVisualLoading(false)
      })
    return () => { cancelled = true }
  }, [call, layout, screen, t, visual])

  React.useEffect(() => {
    if (screen.kind !== 'book' || visual?.kind !== 'pdf' || !pageView) return
    if (!activeChapterId || activeChapterId === screen.content.chapterId) return
    void selectChapter(screen.detail.book.id, activeChapterId)
  }, [activeChapterId, pageView, screen, selectChapter, visual?.kind])

  React.useEffect(() => () => {
    epubCleanupRef.current?.()
    epubCleanupRef.current = null
  }, [visual?.kind === 'epub' ? visual.href : null])

  const goPdfPage = React.useCallback((next: number) => {
    const pageCount = pdfPageCount || pageView?.pageCount || 1
    const page = Math.min(Math.max(1, next), pageCount)
    setVisual(previous => previous?.kind === 'pdf' && previous.page !== page
      ? { ...previous, page }
      : previous)
  }, [pageView, pdfPageCount])

  const stepPdfPage = React.useCallback((delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return
    const pageCount = pdfPageCount || pageView?.pageCount || 1
    setVisual(previous => {
      if (previous?.kind !== 'pdf') return previous
      const page = Math.min(Math.max(1, previous.page + delta * pageStep(layout)), pageCount)
      return page === previous.page ? previous : { ...previous, page }
    })
  }, [layout, pageView, pdfPageCount])

  const zoomPdf = React.useCallback((delta: number) => {
    setVisual(previous => previous?.kind === 'pdf'
      ? { ...previous, scale: Math.min(3, Math.max(1, previous.scale + delta)) }
      : previous)
  }, [])

  const onPdfMouseUp = React.useCallback(() => {
    const active = window.getSelection()
    if (!active || active.isCollapsed || active.rangeCount === 0) return
    const range = active.getRangeAt(0)
    const node = range.startContainer.nodeType === 1
      ? range.startContainer as Element
      : range.startContainer.parentElement
    const span = node?.closest?.('[data-offset]') as HTMLElement | null
    if (!span) return
    const rawText = active.toString()
    const text = rawText.trim()
    if (!text) return
    const leading = rawText.length - rawText.trimStart().length
    const base = Number(span.getAttribute('data-offset')) || 0
    const before = range.cloneRange()
    before.selectNodeContents(span)
    before.setEnd(range.startContainer, range.startOffset)
    const rect = range.getBoundingClientRect()
    setSelection({
      text: text.slice(0, 2000),
      blockIndex: 0,
      offset: base + before.toString().length + leading,
      x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      y: rect.top,
    })
  }, [setSelection])

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
      const page = clampPageIndex(pendingLast ? metrics.pageCount - 1 : epubPageRef.current, metrics.pageCount)
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
  }, [epubChapterId, epubHref, epubPaged, epubReady, layout, resetEpubState])

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
    visual,
    setVisual,
    pageView,
    setPageView,
    pageViews,
    loadedView,
    pdfPageCount,
    pageInput,
    setPageInput,
    visualLoading,
    visualError,
    setVisualError,
    epubReady,
    epubFrameRef,
    epubPage,
    epubPageCount,
    epubPageStart,
    epubPageEnd,
    epubPageTotal,
    goPdfPage,
    stepPdfPage,
    zoomPdf,
    onPdfMouseUp,
    onEpubLoad,
    goEpubChapter,
    goEpubPage,
  }
}
