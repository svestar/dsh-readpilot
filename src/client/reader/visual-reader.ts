import { React, h } from '../common/runtime.ts'
import { renderBlocks } from '../markdown/render.ts'
import { pageSpanWidth, pageWidthForHeight } from './paging.ts'
import type { PageLayout, ReaderMode } from './paging.ts'
import type { MutableRef, PageView, Screen, TextFn, Visual } from '../common/types.ts'

const PDF_WHEEL_THRESHOLD = 40

function contentBox(element: HTMLElement): { width: number; height: number } {
  const style = getComputedStyle(element)
  const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
  const paddingY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
  return {
    width: element.clientWidth - paddingX,
    height: element.clientHeight - paddingY,
  }
}

interface VisualReaderProps {
  t: TextFn
  visual: Visual | null
  screen: Screen
  pageViews: PageView[]
  loadedView: { bookId: string; page: number } | null
  layout: PageLayout
  readingMode?: ReaderMode
  stepPdfPage: (delta: number) => void
  visualLoading: boolean
  visualError: string
  onPdfMouseUp: (pageIndex?: number) => void
  noteLayerRef: MutableRef<HTMLDivElement | null>
  noteLayersRef?: MutableRef<Array<HTMLDivElement | null>>
  onEpubLoad: (event: any) => void
  epubFrameRef: MutableRef<HTMLIFrameElement | null>
}

/** Keep the previous page visible until the next PNG has decoded, so paging does not blink. */
function PdfPageImage({ src, alt }: { src: string; alt: string }) {
  const [shown, setShown] = React.useState(src)
  React.useEffect(() => {
    if (src === shown) return
    let cancelled = false
    const image = new Image()
    const settle = () => {
      if (!cancelled) setShown(src)
    }
    image.onload = settle
    image.onerror = settle
    image.src = src
    return () => {
      cancelled = true
    }
  }, [shown, src])
  return h('img', { src: shown, alt, draggable: false })
}

function renderPdfTextItems(pageView: PageView) {  let offset = 0
  return (pageView.textItems ?? []).map((item, index) => {
    const start = offset
    offset += item.text.length
    return h('span', {
      key: `pdf-text-${index}`,
      className: 'dsh-readpilot-pdf-text-item',
      'data-offset': start,
      style: {
        left: item.left,
        top: item.top,
        width: item.width,
        height: item.height,
        fontSize: item.fontSize,
      },
    }, item.text)
  })
}

export function VisualReader({
  t,
  visual,
  screen,
  pageViews,
  loadedView,
  layout,
  readingMode = 'paged',
  stepPdfPage,
  visualLoading,
  visualError,
  onPdfMouseUp,
  noteLayerRef,
  noteLayersRef,
  onEpubLoad,
  epubFrameRef,
}: VisualReaderProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const spreadRef = React.useRef<HTMLDivElement | null>(null)
  const [pdfFit, setPdfFit] = React.useState(1)
  const [epubWidth, setEpubWidth] = React.useState<number | null>(null)
  const pdfPaged = visual?.kind === 'pdf' && screen.kind === 'book'
  const epubShaped = visual?.kind === 'epub' && screen.kind === 'book'

  React.useEffect(() => {
    const container = containerRef.current
    if (!pdfPaged || !container) return
    let accumulated = 0
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (!event.deltaY) return
      event.preventDefault()
      if ((accumulated > 0) !== (event.deltaY > 0)) accumulated = 0
      accumulated += event.deltaY
      if (Math.abs(accumulated) < PDF_WHEEL_THRESHOLD) return
      const direction = accumulated > 0 ? 1 : -1
      accumulated = 0
      stepPdfPage(direction)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [pdfPaged, stepPdfPage])

  React.useEffect(() => {
    if (!pdfPaged) {
      setPdfFit(1)
      return
    }
    const container = containerRef.current
    if (!container) return
    const spread = spreadRef.current
    if (layout === 'double' && !spread) return
    let lastKey = ''
    const measure = () => {
      if (layout === 'single') {
        const view = pageViews[0]
        if (!view || !(view.width > 0) || !(view.height > 0)) return
        const box = contentBox(container)
        if (!(box.width > 0) || !(box.height > 0)) return
        const key = `single:${box.width}x${box.height}:${view.width}x${view.height}`
        if (key === lastKey) return
        lastKey = key
        setPdfFit(Math.min(1, box.height / view.height, box.width / view.width))
        return
      }
      if (!spread) return
      const box = contentBox(container)
      if (!(box.width > 0) || !(box.height > 0)) return
      const key = `double:${box.width}x${box.height}:${pageViews.map(view => `${view.width}x${view.height}`).join(',')}`
      if (key === lastKey) return
      lastKey = key
      const gap = Number.parseFloat(getComputedStyle(spread).columnGap) || 0
      const pageWidth = pageViews.reduce((sum, view) => sum + view.width, 0)
      const pageHeight = pageViews.reduce((max, view) => Math.max(max, view.height), 0)
      const available = box.width - gap * Math.max(0, pageViews.length - 1)
      setPdfFit(pageWidth > 0 && pageHeight > 0 && available > 0
        ? Math.min(1, available / pageWidth, box.height / pageHeight)
        : 1)
    }
    measure()
    const target = container
    let observer: ResizeObserver | null = null
    if (target && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(measure)
      observer.observe(target)
    }
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [layout, pageViews, pdfPaged, visualError, visualLoading])

  React.useEffect(() => {
    if (!epubShaped) {
      setEpubWidth(null)
      return
    }
    const container = containerRef.current
    if (!container) return
    const spanLayout: PageLayout = readingMode === 'paged' ? layout : 'single'
    let lastKey = ''
    const measure = () => {
      const box = contentBox(container)
      if (!(box.width > 0) || !(box.height > 0)) return
      const key = `${box.width}x${box.height}`
      if (key === lastKey) return
      lastKey = key
      const width = pageSpanWidth(pageWidthForHeight(box.height, box.width), spanLayout)
      setEpubWidth(width > 0 ? width : null)
    }
    measure()
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(measure)
      observer.observe(container)
    }
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [epubShaped, layout, readingMode])

  if (!visual) return null
  if (screen.kind !== 'book') return null
  if (visual.kind === 'pdf') {
    const bookId = screen.detail.book.id
    const loadedPage = loadedView && loadedView.bookId === bookId ? loadedView.page : null
    return h('div', {
      className: 'dsh-readpilot-visual',
      'data-paged': 'true',
      'data-layout': layout,
      ref: containerRef,
    },
    visualError
      ? h('div', { className: 'dsh-readpilot-visual-error' },
        h('div', null, visualError),
        h('div', { className: 'dsh-readpilot-reader-inner' },
          renderBlocks(screen.content.blocks, screen.content.chapterId)))
      : loadedPage !== null && pageViews.length > 0
        ? h('div', { className: 'dsh-readpilot-pdf-spread', ref: spreadRef },
          pageViews.map((view, index) => h('div', {
            key: `pdf-slot-${index}`,
            className: 'dsh-readpilot-pdf-slot',
            style: {
              width: view.width * pdfFit,
              height: view.height * pdfFit,
              flex: 'none',
              position: 'relative',
            },
          },
          h('div', {
            className: 'dsh-readpilot-pdf-page',
            'data-page': loadedPage + index,
            style: {
              width: view.width,
              height: view.height,
              transform: `scale(${pdfFit})`,
              transformOrigin: '0 0',
            },
          },
          h(PdfPageImage, {
            src: `/api/dsh-readpilot/pdf-page?bookId=${encodeURIComponent(bookId)}&page=${loadedPage + index}&scale=${visual.scale}&v=${Math.floor(screen.detail.book.mtimeMs)}`,
            alt: screen.content.title,
          }),
          h('div', {
            className: 'dsh-readpilot-pdf-text',
            onMouseUp: () => onPdfMouseUp(index),
          }, renderPdfTextItems(view)),
          h('div', {
            className: 'dsh-readpilot-note-layer',
            ref: (element: HTMLDivElement | null) => {
              const layers = noteLayersRef?.current
              if (layers) layers[index] = element
              if (index === 0) noteLayerRef.current = element
            },
          })))))
        : visualLoading
          ? h('div', { className: 'dsh-readpilot-muted' }, t('loading'))
          : null,
    visualLoading && loadedPage !== null && !visualError
      ? h('div', { className: 'dsh-readpilot-visual-loading' }, t('loading'))
      : null)
  }
  return h('div', {
    className: 'dsh-readpilot-visual',
    'data-paged': readingMode === 'paged' ? 'true' : 'false',
    'data-layout': layout,
    ref: containerRef,
  },
  h('iframe', {
    ref: epubFrameRef,
    className: 'dsh-readpilot-epub-frame',
    'data-paged': readingMode === 'paged' ? 'true' : 'false',
    sandbox: 'allow-same-origin',
    title: screen.content.title,
    src: `/api/dsh-readpilot/epub-doc?bookId=${encodeURIComponent(screen.detail.book.id)}&href=${encodeURIComponent(visual.href)}&v=${Math.floor(screen.detail.book.mtimeMs)}`,
    onLoad: onEpubLoad,
    style: epubWidth === null ? undefined : { width: epubWidth, maxWidth: '100%', margin: '0 auto' },
  }))
}
