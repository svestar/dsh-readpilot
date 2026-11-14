import { React } from '../../runtime.ts'
import { messageOf, pdfChapterIdForPage } from '../../lib/helpers.ts'
import { pageStep } from './paging.ts'
import type { PageLayout, ReadingAnchor, ReaderMode } from './paging.ts'
import { useEpubPaging } from './use-epub-paging.ts'
import type { ReaderPalette } from '../../lib/preferences.ts'
import type { StateSetter } from '../../runtime.ts'
import type { CallRpc, PageView, Screen, Selection, SelectChapter, TextFn, Visual } from '../../lib/types.ts'

interface VisualOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  palette: ReaderPalette
  setSelection: StateSetter<Selection | null>
  selectChapter: SelectChapter
  readingMode?: ReaderMode
  layout?: PageLayout
  anchor?: ReadingAnchor | null
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
  anchor,
}: VisualOptions) {
  const [visual, setVisual] = React.useState<Visual | null>(null)
  const [pageView, setPageView] = React.useState<PageView | null>(null)
  const [pageViews, setPageViews] = React.useState<PageView[]>([])
  const [loadedView, setLoadedView] = React.useState<{ bookId: string; page: number } | null>(null)
  const [pdfPageCount, setPdfPageCount] = React.useState(0)
  const [pageInput, setPageInput] = React.useState('1')
  const [visualLoading, setVisualLoading] = React.useState(false)
  const [visualError, setVisualError] = React.useState('')

  const activeChapterId = screen.kind === 'book'
    ? (visual?.kind === 'pdf'
      ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
      : screen.content.chapterId)
    : ''

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

  const onPdfMouseUp = React.useCallback((pageIndex = 0) => {
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
    const page = (visual?.kind === 'pdf' ? visual.page : 0) + pageIndex
    const chapterId = screen.kind === 'book'
      ? pdfChapterIdForPage(screen, page, screen.content.chapterId)
      : undefined
    setSelection({
      text: text.slice(0, 2000),
      blockIndex: 0,
      offset: base + before.toString().length + leading,
      x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      y: rect.top,
      ...(chapterId ? { chapterId } : {}),
    })
  }, [screen, setSelection, visual])

  const epub = useEpubPaging({ screen, visual, readingMode, layout, anchor, selectChapter, palette, setSelection })

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
    goPdfPage,
    stepPdfPage,
    zoomPdf,
    onPdfMouseUp,
    ...epub,
  }
}
