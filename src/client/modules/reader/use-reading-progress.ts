import { React } from '../../runtime.ts'
import { chapterPercent, columnsFor, pdfPagePercent } from './paging.ts'
import type { PageLayout, ReaderMode } from './paging.ts'
import type { TextPager } from './use-text-pager.ts'
import type { BookFormat } from '../../../shared/book-format.ts'
import type { CallRpc, Screen, Selection, Visual } from '../../lib/types.ts'

interface ReadingProgressOptions {
  call: CallRpc
  screen: Screen
  activeChapterId: string
  chapterIndex: number
  chapterTotal: number
  effectiveMode: ReaderMode
  format: BookFormat | null
  reflowMode: boolean
  textPager: TextPager
  visual: Visual | null
  pdfPageCount: number
  epubPage: number
  epubPageCount: number
  selection: Selection | null
  activeSessionId: string | null
  progressSkipRef: { current: boolean }
}

/** Reading position, percentage and the Host companion-context/progress writes. */
export function useReadingProgress({
  call,
  screen,
  activeChapterId,
  chapterIndex,
  chapterTotal,
  effectiveMode,
  format,
  reflowMode,
  textPager,
  visual,
  pdfPageCount,
  epubPage,
  epubPageCount,
  selection,
  activeSessionId,
  progressSkipRef,
}: ReadingProgressOptions) {
  const toc = screen.kind === 'book' ? screen.detail.toc : []
  const activeChapterIndex = toc.findIndex(item => item.id === activeChapterId)
  const pdfVisualPage = visual?.kind === 'pdf' ? visual.page : 1
  const chapterFraction = screen.kind !== 'book'
    ? 0
    : format === 'pdf' && !reflowMode
      ? 0
      : format === 'epub' && !reflowMode
        ? epubPage / Math.max(1, epubPageCount)
        : textPager.page / Math.max(1, textPager.pageCount)

  const readingPercent = screen.kind !== 'book'
    ? 0
    : format === 'pdf' && !reflowMode
      ? pdfPagePercent(pdfVisualPage, pdfPageCount || toc.length || 1)
      : format === 'epub' && !reflowMode
        ? chapterPercent(toc, chapterIndex, epubPage, epubPageCount)
        : chapterPercent(toc, activeChapterIndex >= 0 ? activeChapterIndex : chapterIndex, textPager.page, textPager.pageCount)

  const readingView = React.useMemo(() => {
    if (screen.kind !== 'book') return null
    const view: Record<string, unknown> = {
      mode: effectiveMode,
      chapterIndex: activeChapterIndex >= 0 ? activeChapterIndex : chapterIndex,
      chapterTotal,
    }
    if (effectiveMode === 'paged') {
      if (format === 'pdf' && !reflowMode && visual?.kind === 'pdf') {
        view.pageStart = pdfVisualPage
        view.pageEnd = pdfVisualPage
        if (pdfPageCount > 0) view.pageTotal = pdfPageCount
      } else if (format === 'epub' && !reflowMode) {
        view.pageStart = epubPage + 1
        view.pageEnd = epubPage + 1
        if (epubPageCount > 0) view.pageTotal = epubPageCount
      } else {
        view.pageStart = textPager.pageStart
        view.pageEnd = textPager.pageEnd
        view.pageTotal = textPager.pageTotal
      }
    }
    if (selection?.text) {
      view.selection = selection.text.slice(0, 4000)
      if (Number.isInteger(selection.blockIndex)) view.selectionBlockIndex = selection.blockIndex
      if (Number.isInteger(selection.offset)) view.selectionOffset = selection.offset
    }
    return view
  }, [
    activeChapterIndex,
    chapterIndex,
    chapterTotal,
    effectiveMode,
    epubPage,
    epubPageCount,
    format,
    pdfPageCount,
    pdfVisualPage,
    reflowMode,
    selection?.blockIndex,
    selection?.offset,
    selection?.text,
    textPager.pageEnd,
    textPager.pageStart,
    textPager.pageTotal,
    visual?.kind,
  ])
  const readingViewKey = JSON.stringify(readingView)

  React.useEffect(() => {
    if (screen.kind !== 'book' || !activeSessionId || !readingView) return
    void call('companionContext', {
      sessionId: activeSessionId,
      bookId: screen.detail.book.id,
      title: screen.detail.book.title,
      chapter: screen.content.title,
      view: readingView,
    }).catch(() => {})
  }, [activeSessionId, readingViewKey, screen, call])

  React.useEffect(() => {
    if (screen.kind !== 'book' || !activeChapterId) return
    if (progressSkipRef.current) {
      progressSkipRef.current = false
      return
    }
    const chapterTitle = toc.find(item => item.id === activeChapterId)?.title ?? screen.content.title
    const timer = window.setTimeout(() => {
      void call('progress', {
        bookId: screen.detail.book.id,
        chapterId: activeChapterId,
        chapterTitle,
        chapterFraction: Math.round(chapterFraction * 1000) / 1000,
        percent: Math.round(readingPercent * 10) / 10,
      }).catch(() => {})
    }, 350)
    return () => window.clearTimeout(timer)
  }, [activeChapterId, chapterFraction, readingPercent, screen, toc, call])

  return {
    activeChapterIndex,
    pdfVisualPage,
    chapterFraction,
    readingPercent,
    readingView,
    readingViewKey,
  }
}

/** Kept close to the progress math so the PDF page span matches the pager. */
export function visiblePdfPageEnd(page: number, layout: PageLayout, pageCount: number): number {
  return Math.min(page + columnsFor(layout) - 1, pageCount || page)
}
