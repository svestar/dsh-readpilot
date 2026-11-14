import { React } from '../../runtime.ts'
import { chapterPercent, pdfPagePercent } from '../reader/paging.ts'
import { publishProgressSync } from '../reader/progress-sync.ts'
import type { CallRpc, Screen, Visual } from '../../lib/types.ts'
import type { TextPager } from '../reader/use-text-pager.ts'

const SIDEBAR_PROGRESS_DEBOUNCE = 400

interface SidebarProgressOptions {
  call: CallRpc
  screen: Screen
  mode: 'text' | 'original'
  textPager: TextPager
  visual: Visual | null
  pdfPageCount: number
  epubPage: number
  epubPageCount: number
  sessionId?: string
  activeChapterId: string | null
  progressSkipRef: { current: boolean }
}

export function useSidebarProgress({
  call,
  screen,
  mode,
  textPager,
  visual,
  pdfPageCount,
  epubPage,
  epubPageCount,
  sessionId,
  activeChapterId,
  progressSkipRef,
}: SidebarProgressOptions) {
  const chapterIndex = screen.kind === 'book'
    ? screen.detail.toc.findIndex((item: any) => item.id === screen.content.chapterId)
    : -1
  const chapterTotal = screen.kind === 'book' ? screen.detail.toc.length : 0

  const activeChapterIndex = screen.kind === 'book'
    ? screen.detail.toc.findIndex((item: any) => item.id === activeChapterId)
    : -1
  const chapterFraction = screen.kind !== 'book'
    ? 0
    : mode === 'text'
      ? textPager.page / Math.max(1, textPager.pageCount)
      : visual?.kind === 'epub'
        ? epubPage / Math.max(1, epubPageCount)
        : 0
  const chapterPage = mode === 'text' ? textPager.page : visual?.kind === 'epub' ? epubPage : 0
  const chapterPages = mode === 'text' ? textPager.pageCount : visual?.kind === 'epub' ? epubPageCount : 1
  const readingPercent = screen.kind !== 'book'
    ? 0
    : screen.detail.book.format === 'pdf' && mode === 'original' && visual?.kind === 'pdf'
      ? pdfPagePercent(visual.page, pdfPageCount || screen.detail.toc.length || 1)
      : chapterPercent(screen.detail.toc, activeChapterIndex >= 0 ? activeChapterIndex : chapterIndex, chapterPage, chapterPages)

  const readingView = React.useMemo(() => {
    if (screen.kind !== 'book') return null
    const view: Record<string, unknown> = { mode: 'paged', chapterIndex, chapterTotal }
    if (mode === 'text') {
      view.pageStart = textPager.pageStart
      view.pageEnd = textPager.pageEnd
      view.pageTotal = textPager.pageTotal
    } else if (visual?.kind === 'pdf') {
      view.pageStart = visual.page
      view.pageEnd = visual.page
      if (pdfPageCount > 0) view.pageTotal = pdfPageCount
    } else {
      view.pageStart = epubPage + 1
      view.pageEnd = epubPage + 1
      if (epubPageCount > 0) view.pageTotal = epubPageCount
    }
    return view
  }, [chapterIndex, chapterTotal, epubPage, epubPageCount, mode, pdfPageCount, screen, textPager.pageEnd, textPager.pageStart, textPager.pageTotal, visual])
  const readingViewKey = JSON.stringify(readingView)

  React.useEffect(() => {
    if (screen.kind !== 'book' || !activeChapterId || !sessionId || !readingView) return
    const chapterTitle = screen.detail.toc.find((item: any) => item.id === activeChapterId)?.title ?? screen.content.title
    void call('companionContext', {
      sessionId,
      bookId: screen.detail.book.id,
      title: screen.detail.book.title,
      chapter: chapterTitle,
      view: readingView,
    }).catch(() => {})
  }, [activeChapterId, call, readingViewKey, screen, sessionId])

  React.useEffect(() => {
    if (screen.kind !== 'book' || !activeChapterId) return
    if (progressSkipRef.current) {
      progressSkipRef.current = false
      return
    }
    const chapterTitle = screen.detail.toc.find((item: any) => item.id === activeChapterId)?.title ?? screen.content.title
    const timer = window.setTimeout(() => {
      const fraction = Math.round(chapterFraction * 1000) / 1000
      void call('progress', {
        bookId: screen.detail.book.id,
        chapterId: activeChapterId,
        chapterTitle,
        chapterFraction: fraction,
        percent: Math.round(readingPercent * 10) / 10,
      }).then(() => publishProgressSync({
        bookId: screen.detail.book.id,
        chapterId: activeChapterId,
        chapterFraction: fraction,
        origin: 'sidebar',
      })).catch(() => {})
    }, SIDEBAR_PROGRESS_DEBOUNCE)
    return () => window.clearTimeout(timer)
  }, [activeChapterId, chapterFraction, readingPercent, screen, call])

  return {
    chapterIndex,
    chapterTotal,
    chapterFraction,
    readingPercent,
    readingView,
  }
}
