import { h } from '../../runtime.ts'
import { renderBlocks } from '../markdown/render.ts'
import { ReaderBar } from './ReaderBar.ts'
import { VisualReader } from './VisualReader.ts'
import { pageSpanWidth } from './paging.ts'
import { visiblePdfPageEnd } from './use-reading-progress.ts'
import type { ReaderPanelModel } from './use-reader-panel.ts'
import type { TextFn } from '../../lib/types.ts'

interface ReaderBodyProps {
  t: TextFn
  model: ReaderPanelModel
  onHistory: () => void
}

/** Reader bar, visual page and the reflow text pager for an open book. */
export function ReaderBodyView({ t, model, onHistory }: ReaderBodyProps) {
  const { prefs, view, notes } = model
  const screen = model.screen
  if (screen.kind !== 'book') return null
  const format = prefs.supportedFormat
  const effectiveMode = prefs.effectiveMode
  const textLayout = prefs.textLayout
  const pdfPage = view.visual?.kind === 'pdf' ? view.visual.page : 1

  const barProps = format === 'pdf'
    ? {
      pageStart: pdfPage,
      pageEnd: visiblePdfPageEnd(pdfPage, prefs.pageLayout, view.pdfPageCount || pdfPage),
      pageTotal: view.pdfPageCount || 1,
      percent: view.readingPercent,
      canPrev: pdfPage > 1,
      canNext: pdfPage < view.pdfPageCount,
      onPrev: () => view.stepPdfPage(-1),
      onNext: () => view.stepPdfPage(1),
      pageInput: view.pageInput,
      setPageInput: view.setPageInput,
      onPageCommit: view.goPdfPage,
      zoom: view.visual?.kind === 'pdf' ? view.visual.scale : 1,
      onZoom: view.zoomPdf,
    }
    : format === 'epub'
      ? effectiveMode === 'paged'
        ? {
          pageStart: view.epubPage + 1,
          pageEnd: view.epubPage + 1,
          pageTotal: view.epubPageCount,
          percent: view.readingPercent,
          canPrev: view.epubPage > 0 || view.chapterIndex > 0,
          canNext: view.epubPage < view.epubPageCount - 1 || view.chapterIndex < view.chapterTotal - 1,
          onPrev: () => view.goEpubPage(-1),
          onNext: () => view.goEpubPage(1),
        }
        : {
          pageStart: 1,
          pageEnd: 1,
          pageTotal: 1,
          percent: view.readingPercent,
          canPrev: view.chapterIndex > 0,
          canNext: view.chapterIndex >= 0 && view.chapterIndex < view.chapterTotal - 1,
          onPrev: () => view.goEpubChapter(-1),
          onNext: () => view.goEpubChapter(1),
        }
      : effectiveMode === 'paged'
        ? {
          pageStart: view.textPager.pageStart,
          pageEnd: view.textPager.pageEnd,
          pageTotal: view.textPager.pageTotal,
          percent: view.readingPercent,
          reflow: prefs.reflowMode,
          canPrev: view.textPager.canPrev,
          canNext: view.textPager.canNext,
          onPrev: () => view.textPager.goPage(-1),
          onNext: () => view.textPager.goPage(1),
        }
        : {
          pageStart: 1,
          pageEnd: 1,
          pageTotal: 1,
          percent: view.readingPercent,
          canPrev: view.chapterIndex > 0,
          canNext: view.chapterIndex >= 0 && view.chapterIndex < view.chapterTotal - 1,
          onPrev: () => view.goChapter(-1),
          onNext: () => view.goChapter(1),
        }

  const readerBar = h(ReaderBar, {
    t,
    format: format ?? 'txt',
    mode: effectiveMode,
    layout: textLayout,
    chapterTitle: screen.content.title,
    chapterIndex: view.chapterIndex,
    chapterTotal: view.chapterTotal,
    ...barProps,
    reflow: prefs.reflowMode,
    onHistory,
  })

  const visualReader = view.visual ? h(VisualReader, {
    t,
    visual: view.visual,
    screen,
    pageViews: view.pageViews,
    loadedView: view.loadedView,
    layout: prefs.pageLayout,
    readingMode: effectiveMode,
    stepPdfPage: view.stepPdfPage,
    visualLoading: view.visualLoading,
    visualError: view.visualError,
    onPdfMouseUp: view.onPdfMouseUp,
    noteLayerRef: notes.noteLayerRef,
    noteLayersRef: notes.noteLayersRef,
    onEpubLoad: view.onEpubLoad,
    epubFrameRef: view.epubFrameRef,
  }) : null

  const pageSpan = pageSpanWidth(view.textPageWidth, textLayout)
  const pageFrameStyle = pageSpan > 0
    ? { width: `${pageSpan}px`, maxWidth: '100%', margin: '0 auto' }
    : undefined
  const textColumnStyle = view.textPageWidth > 0
    ? { width: `${view.textPageWidth}px`, maxWidth: '100%', margin: '0 auto' }
    : undefined
  const textReader = effectiveMode === 'paged'
    ? h('div', {
      className: 'dsh-readpilot-reader',
      'data-paged': 'true',
      ref: view.contentRef,
      style: { fontSize: prefs.fontSize },
      onMouseUp: model.find.onContentMouseUp,
    },
    h('div', { className: 'dsh-readpilot-page-frame', ref: view.textPager.frameRef, style: pageFrameStyle },
      h('div', {
        className: 'dsh-readpilot-reader-inner dsh-readpilot-paged-inner',
        ref: view.textPager.innerRef,
        style: view.textPager.innerStyle,
      },
      h('h1', { className: 'dsh-readpilot-chapter-title' }, screen.content.title),
      renderBlocks(screen.content.blocks, screen.content.chapterId),
      h('div', { className: 'dsh-readpilot-note-layer', ref: notes.noteLayerRef }))))
    : h('div', {
      className: 'dsh-readpilot-reader',
      'data-paged': 'false',
      ref: view.contentRef,
      style: { fontSize: prefs.fontSize },
      onMouseUp: model.find.onContentMouseUp,
    },
    h('div', { className: 'dsh-readpilot-reader-inner', style: textColumnStyle },
      h('h1', { className: 'dsh-readpilot-chapter-title' }, screen.content.title),
      renderBlocks(screen.content.blocks, screen.content.chapterId),
      h('div', { className: 'dsh-readpilot-note-layer', ref: notes.noteLayerRef })))

  return h('div', { className: 'dsh-readpilot-main' },
    readerBar,
    visualReader ?? textReader)
}
