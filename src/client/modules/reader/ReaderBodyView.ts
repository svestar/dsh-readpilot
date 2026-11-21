import { React, h } from '../../runtime.ts'
import { renderBlocks, renderBlocksWithTranslations } from '../markdown/render.ts'
import { translationBlocksOf } from '../translation/blocks.ts'
import { TranslationControl } from '../translation/TranslationControl.ts'
import { firstVisibleBlock, visibleBlockIndices } from './block-visibility.ts'
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
  const translation = model.translation
  const inlineAvailable = !screen.detail.scanOnly && view.visual === null
  const translationBlocks = inlineAvailable && translation.enabled ? translationBlocksOf(screen.content) : []
  const [visibilityTick, setVisibilityTick] = React.useState(0)
  const viewKey = inlineAvailable && translation.enabled
    ? `${screen.detail.book.id}\u0000${screen.content.chapterId}:${effectiveMode === 'paged' ? view.textPager.navigationToken : visibilityTick}`
    : ''
  const anchorBlockRef = React.useRef<number | null>(null)
  const anchorKeyRef = React.useRef('')
  const anchorRevisionRef = React.useRef(0)
  translation.setViewKey(viewKey)

  React.useEffect(() => {
    anchorBlockRef.current = null
    anchorKeyRef.current = ''
    anchorRevisionRef.current = translation.revision
  }, [screen.content.chapterId])

  React.useEffect(() => {
    if (!inlineAvailable || !translation.enabled) return
    const targets = [view.contentRef.current, view.textPager.innerRef.current].filter(Boolean) as HTMLElement[]
    if (targets.length === 0) return
    let frame = 0
    const bump = () => {
      if (frame) return
      frame = (typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (fn: () => void) => { fn(); return 0 })(() => {
        frame = 0
        setVisibilityTick(value => value + 1)
      })
    }
    for (const target of targets) target.addEventListener('scroll', bump, { passive: true })
    return () => {
      for (const target of targets) target.removeEventListener('scroll', bump)
      if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    }
  }, [inlineAvailable, translation.enabled, view.contentRef, view.textPager.innerRef])

  React.useEffect(() => {
    if (!inlineAvailable || !translation.enabled) {
      anchorBlockRef.current = null
      anchorKeyRef.current = ''
      return
    }
    if (anchorBlockRef.current !== null && anchorKeyRef.current !== viewKey) {
      anchorBlockRef.current = null
      anchorKeyRef.current = ''
    }
    const container = view.contentRef.current
    const visible = visibleBlockIndices(container)
    const candidates = visible.size === 0 ? translationBlocks : translationBlocks.filter(block => visible.has(block.index))
    const missing = candidates.filter(block => !translation.blocks[block.index])
    if (missing.length === 0) return
    if (anchorBlockRef.current === null) {
      anchorBlockRef.current = firstVisibleBlock(container)
      anchorKeyRef.current = viewKey
      anchorRevisionRef.current = translation.revision
    }
    void translation.translateAll(missing, viewKey)
  }, [
    inlineAvailable,
    translation.blocks,
    translation.enabled,
    translation.provider,
    translation.targetLanguage,
    translation.translateAll,
    translationBlocks,
    view.contentRef,
    viewKey,
    visibilityTick,
  ])

  React.useEffect(() => {
    const index = anchorBlockRef.current
    if (index === null) return
    if (anchorKeyRef.current !== viewKey) {
      anchorBlockRef.current = null
      anchorKeyRef.current = ''
      return
    }
    if (translation.revision === anchorRevisionRef.current) return
    const restore = () => {
      const container = view.contentRef.current
      const element = container?.querySelector<HTMLElement>(`[data-block-index="${index}"]`)
      if (effectiveMode === 'paged') {
        view.textPager.scrollToBlock(index)
      } else {
        try {
          element?.scrollIntoView({ block: 'start', inline: 'start' })
        } catch {
          // A paged container may not be scrollable on every browser.
        }
      }
      anchorBlockRef.current = null
      anchorKeyRef.current = ''
    }
    let frame: number | undefined
    if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(restore)
    else restore()
    return () => {
      if (frame !== undefined && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
    }
  }, [effectiveMode, translation.revision, view.contentRef, view.textPager, viewKey])

  const contentBlocks = inlineAvailable && translation.enabled
    ? renderBlocksWithTranslations(
      screen.content.blocks,
      screen.content.chapterId,
      translation.blocks,
      t('translating'),
      effectiveMode !== 'paged',
    )
    : renderBlocks(screen.content.blocks, screen.content.chapterId)

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
    translationControl: h(TranslationControl, { t, state: translation, settingsOnly: !inlineAvailable }),
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
      contentBlocks,
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
      contentBlocks,
      h('div', { className: 'dsh-readpilot-note-layer', ref: notes.noteLayerRef })))

  return h('div', { className: 'dsh-readpilot-main' },
    readerBar,
    visualReader ?? textReader)
}
