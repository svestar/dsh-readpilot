import { React } from '../runtime.ts'
import { applyPaletteToFrame, messageOf } from '../helpers.ts'
import type { ReaderPalette } from '../helpers.ts'
import type { StateSetter } from '../runtime.ts'
import type { CallRpc, PageView, Screen, Selection, SelectChapter, TextFn, Visual } from '../types.ts'

interface VisualOptions {
  call: CallRpc
  t: TextFn
  screen: Screen
  palette: ReaderPalette
  setSelection: StateSetter<Selection | null>
  selectChapter: SelectChapter
}

export function useVisual({
  call,
  t,
  screen,
  palette,
  setSelection,
  selectChapter,
}: VisualOptions) {
  const [visual, setVisual] = React.useState<Visual | null>(null)
  const [pageView, setPageView] = React.useState<PageView | null>(null)
  const [pageInput, setPageInput] = React.useState('1')
  const [visualLoading, setVisualLoading] = React.useState(false)
  const [visualError, setVisualError] = React.useState('')
  const [epubReady, setEpubReady] = React.useState(0)
  const epubFrameRef = React.useRef<HTMLIFrameElement | null>(null)
  const epubCleanupRef = React.useRef<(() => void) | null>(null)
  const activeChapterId = screen.kind === 'book'
    ? (visual?.kind === 'pdf'
      ? screen.detail.toc.find(item => item.page === visual.page)?.id ?? screen.content.chapterId
      : screen.content.chapterId)
    : ''

  React.useEffect(() => {
    if (!visual || visual.kind !== 'pdf' || screen.kind !== 'book') {
      setPageView(null)
      return
    }
    let cancelled = false
    setVisualLoading(true)
    setVisualError('')
    call('pageView', {
      bookId: screen.detail.book.id,
      page: visual.page,
      scale: visual.scale,
    }).then((value: any) => {
      if (cancelled) return
      setPageView(value)
      setPageInput(String(visual.page))
    }).catch((cause: unknown) => {
      if (cancelled) return
      setPageView(null)
      setVisualError(`${t('loadFailed')}：${messageOf(cause)}`)
    }).finally(() => {
      if (!cancelled) setVisualLoading(false)
    })
    return () => { cancelled = true }
  }, [call, screen, t, visual])

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
    const pageCount = pageView?.pageCount ?? 1
    const page = Math.min(Math.max(1, next), pageCount)
    setVisual(previous => previous?.kind === 'pdf' ? { ...previous, page } : previous)
  }, [pageView])

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
    epubCleanupRef.current = () => doc.removeEventListener('mouseup', handler)
  }, [palette, setSelection])

  React.useEffect(() => {
    if (visual?.kind === 'epub' && epubFrameRef.current) {
      applyPaletteToFrame(epubFrameRef.current, palette)
    }
  }, [palette, visual?.kind === 'epub' ? visual.href : null])

  const goEpubChapter = React.useCallback((delta: number) => {
    if (screen.kind !== 'book') return
    const index = screen.detail.toc.findIndex(item => item.id === screen.content.chapterId)
    const next = screen.detail.toc[index + delta]
    if (next) void selectChapter(screen.detail.book.id, next.id)
  }, [screen, selectChapter])

  return {
    visual,
    setVisual,
    pageView,
    setPageView,
    pageInput,
    setPageInput,
    visualLoading,
    visualError,
    setVisualError,
    epubReady,
    epubFrameRef,
    goPdfPage,
    zoomPdf,
    onPdfMouseUp,
    onEpubLoad,
    goEpubChapter,
  }
}
