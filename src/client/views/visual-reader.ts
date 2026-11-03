import { h } from '../runtime.ts'
import { renderBlocks } from './markdown.ts'
import type { StateSetter } from '../runtime.ts'
import type { MutableRef, PageView, Screen, TextFn, Visual } from '../types.ts'

interface VisualReaderProps {
  t: TextFn
  visual: Visual | null
  screen: Screen
  pageView: PageView | null
  pageInput: string
  setPageInput: StateSetter<string>
  goPdfPage: (page: number) => void
  zoomPdf: (delta: number) => void
  visualLoading: boolean
  visualError: string
  onPdfMouseUp: () => void
  noteLayerRef: MutableRef<HTMLDivElement | null>
  goEpubChapter: (delta: number) => void
  onEpubLoad: (event: any) => void
  epubFrameRef: MutableRef<HTMLIFrameElement | null>
}

export function VisualReader({
  t, visual, screen, pageView, pageInput, setPageInput, goPdfPage, zoomPdf,
  visualLoading, visualError, onPdfMouseUp, noteLayerRef, goEpubChapter, onEpubLoad, epubFrameRef,
}: VisualReaderProps) {
  if (!visual) return null
  if (screen.kind !== 'book') return null
  const pdfPageUrl = visual.kind === 'pdf' && screen.kind === 'book'
    ? `/api/dsh-reader/pdf-page?bookId=${encodeURIComponent(screen.detail.book.id)}&page=${visual.page}&scale=${visual.scale}`
    : ''
  const epubIndex = screen.kind === 'book'
    ? screen.detail.toc.findIndex(item => item.id === screen.content.chapterId)
    : -1
  return (visual?.kind === 'pdf'
        ? h('div', { className: 'dsh-reader-visual' },
          h('div', { className: 'dsh-reader-visual-bar' },
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              disabled: visual.page <= 1,
              onClick: () => goPdfPage(visual.page - 1),
            }, '‹'),
            h('input', {
              className: 'dsh-reader-page-input',
              type: 'number',
              min: 1,
              max: pageView?.pageCount ?? 1,
              value: pageInput,
              onChange: (event: any) => setPageInput(event.target.value),
              onKeyDown: (event: any) => {
                if (event.key === 'Enter') goPdfPage(Number(pageInput))
              },
            }),
            h('span', { className: 'dsh-reader-page-total' }, `/ ${pageView?.pageCount ?? '?'}`),
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              disabled: Boolean(pageView && visual.page >= pageView.pageCount),
              onClick: () => goPdfPage(visual.page + 1),
            }, '›'),
            h('button', { type: 'button', className: 'dsh-reader-secondary', onClick: () => zoomPdf(-0.25) }, '−'),
            h('span', { className: 'dsh-reader-page-total' }, `${Math.round(visual.scale * 100)}%`),
            h('button', { type: 'button', className: 'dsh-reader-secondary', onClick: () => zoomPdf(0.25) }, '+')),
          visualLoading
            ? h('div', { className: 'dsh-reader-muted' }, t('loading'))
            : visualError
              ? h('div', { className: 'dsh-reader-visual-error' },
                h('div', null, visualError),
                h('div', { className: 'dsh-reader-reader-inner' },
                  renderBlocks(screen.content.blocks, screen.content.chapterId)))
              : pageView
                ? h('div', {
                  className: 'dsh-reader-pdf-page',
                  style: { width: pageView.width, height: pageView.height },
                },
                h('img', { src: pdfPageUrl, alt: screen.content.title, draggable: false }),
                h('div', { className: 'dsh-reader-pdf-text', onMouseUp: onPdfMouseUp },
                  (pageView.textItems ?? []).map((item, index) => {
                    const offset = (pageView.textItems ?? [])
                      .slice(0, index)
                      .reduce((sum, entry) => sum + entry.text.length, 0)
                    return h('span', {
                      key: `pdf-text-${index}`,
                      className: 'dsh-reader-pdf-text-item',
                      'data-offset': offset,
                      style: {
                        left: item.left,
                        top: item.top,
                        width: item.width,
                        height: item.height,
                        fontSize: item.fontSize,
                      },
                    }, item.text)
                  })),
                h('div', { className: 'dsh-reader-note-layer', ref: noteLayerRef }))
                : null)
        : visual?.kind === 'epub'
          ? h('div', { className: 'dsh-reader-visual' },
            h('div', { className: 'dsh-reader-visual-bar dsh-reader-epub-bar' },
              h('button', {
                type: 'button',
                className: 'dsh-reader-secondary',
                disabled: epubIndex <= 0,
                onClick: () => goEpubChapter(-1),
              }, '‹'),
              h('span', {
                className: 'dsh-reader-page-total dsh-reader-epub-title',
                title: screen.content.title,
              }, screen.content.title),
              h('button', {
                type: 'button',
                className: 'dsh-reader-secondary',
                disabled: epubIndex < 0 || epubIndex >= screen.detail.toc.length - 1,
                onClick: () => goEpubChapter(1),
              }, '›')),
            h('iframe', {
              ref: epubFrameRef,
              className: 'dsh-reader-epub-frame',
              sandbox: 'allow-same-origin',
              title: screen.content.title,
              src: `/api/dsh-reader/epub-doc?bookId=${encodeURIComponent(screen.detail.book.id)}&href=${encodeURIComponent(visual.href)}`,
              onLoad: onEpubLoad,
            }))
          : null
)
}
