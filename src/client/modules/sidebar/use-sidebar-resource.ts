import { React } from '../../runtime.ts'
import { readPaletteId, resolveReaderPalette } from '../../lib/preferences.ts'
import { parseReaderResource } from '../reader/resource.ts'
import { selectionAnchor } from '../markdown/render.ts'
import { chapterFractionForOffset } from './navigation.ts'
import type { SidebarBook, SidebarMode } from './navigation.ts'
import type { ReadingAnchor } from '../reader/paging.ts'
import type { CallRpc, Screen, SelectTarget, TextFn } from '../../lib/types.ts'

interface SidebarResourceOptions {
  call: CallRpc
  t: TextFn
  sessionId?: string
  useTabInfo?: () => {
    tab?: {
      contentId?: string
      navigation?: { revision?: number; params?: { address?: string } }
    }
  } | null
}

export function useSidebarResource({ call, t, sessionId, useTabInfo }: SidebarResourceOptions) {
  const tab = useTabInfo ? useTabInfo() : null
  const revision = tab?.tab?.navigation?.revision ?? 0
  const resourceAddress = tab?.tab?.contentId
    || tab?.tab?.navigation?.params?.address
    || ''
  const [book, setBook] = React.useState<SidebarBook | null>(null)
  const [screen, setScreen] = React.useState<Screen>({ kind: 'library' })
  const [mode, setMode] = React.useState<SidebarMode>('text')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [anchor, setAnchor] = React.useState<ReadingAnchor | null>(null)
  const [selection, setSelection] = React.useState<any>(null)
  const anchorTokenRef = React.useRef(0)
  const progressSkipRef = React.useRef(true)

  const palette = resolveReaderPalette(readPaletteId())
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const visualBookRef = React.useRef('')

  const selectChapter = React.useCallback(async (bookId: string, chapterId: string, target?: SelectTarget) => {
    try {
      const content = await call('chapter', { bookId, chapterId })
      const offset = typeof target?.offset === 'number' ? target.offset : null
      const fraction = chapterFractionForOffset(content.blocks, offset)
      setAnchor(fraction !== null
        ? { chapterId, fraction, token: ++anchorTokenRef.current }
        : null)
      setScreen(previous => previous.kind === 'book' ? { ...previous, content } : previous)
    } catch (cause) {
      setError(`${t('loadFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }, [call, t])

  React.useEffect(() => {
    const resource = parseReaderResource(resourceAddress)
    if (!sessionId && !resource) {
      setBook(null)
      setScreen({ kind: 'library' })
      setLoading(false)
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      if (resource) {
        const detail = await call('open', { bookId: resource.bookId })
        if (cancelled) return
        if (!detail.supported) throw new Error(t('unsupported'))
        const target = detail.toc.find((item: any) => item.id === resource.chapterId)
          ?? detail.toc.find((item: any) => item.id === detail.progress?.chapterId)
          ?? detail.toc[0]
        if (!target) throw new Error(t('unsupported'))
        if (detail.scanOnly) {
          setBook({ bookId: resource.bookId, title: detail.book.title, format: detail.book.format })
          setMode('original')
          setAnchor(null)
          progressSkipRef.current = true
          setScreen({
            kind: 'book',
            detail,
            content: { chapterId: target.id, title: target.title, blocks: [], locator: `${resource.bookId}:${target.id}:0` },
          })
          return
        }
        const content = await call('chapter', { bookId: resource.bookId, chapterId: target.id })
        if (cancelled) return
        setBook({ bookId: resource.bookId, title: detail.book.title, format: detail.book.format })
        if (detail.book.format === 'txt' || detail.book.format === 'md') setMode('text')
        const offset = typeof resource.offset === 'number' ? resource.offset : null
        const fraction = chapterFractionForOffset(content.blocks, offset)
        setAnchor(fraction !== null
          ? { chapterId: target.id, fraction, token: ++anchorTokenRef.current }
          : null)
        progressSkipRef.current = true
        setScreen({ kind: 'book', detail, content })
        return
      }
      if (!sessionId) return
      const found = await call('sessionBook', { sessionId }) as SidebarBook | null
      if (cancelled) return
      if (!found) {
        setBook(null)
        setScreen({ kind: 'library' })
        return
      }
      setBook(found)
      if (found.format === 'txt' || found.format === 'md') setMode('text')
      const detail = await call('open', { bookId: found.bookId })
      if (cancelled) return
      if (!detail.supported) throw new Error(t('unsupported'))
      const target = detail.toc.find((item: any) => item.id === detail.progress?.chapterId) ?? detail.toc[0]
      if (!target) throw new Error(t('unsupported'))
      if (detail.scanOnly) {
        setMode('original')
        setAnchor(null)
        progressSkipRef.current = true
        setScreen({
          kind: 'book',
          detail,
          content: { chapterId: target.id, title: target.title, blocks: [], locator: `${found.bookId}:${target.id}:0` },
        })
        return
      }
      const content = await call('chapter', { bookId: found.bookId, chapterId: target.id })
      if (cancelled) return
      const fraction = detail.progress?.chapterFraction
      setAnchor(typeof fraction === 'number' && Number.isFinite(fraction)
        ? { chapterId: target.id, fraction: Math.max(0, Math.min(1, fraction)), token: ++anchorTokenRef.current }
        : null)
      progressSkipRef.current = true
      setScreen({ kind: 'book', detail, content })
    })().catch((cause: unknown) => {
      if (!cancelled) setError(`${t('loadFailed')}：${cause instanceof Error ? cause.message : String(cause)}`)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [call, resourceAddress, revision, sessionId, t])

  const captureSelection = React.useCallback((target: EventTarget | null) => {
    const targetElement = target instanceof Element ? target : null
    if (targetElement?.closest('.dsh-readpilot-selection, [role="dialog"]')) return
    const root = rootRef.current
    const active = window.getSelection()
    if (!root || !active || active.isCollapsed || active.rangeCount === 0) return
    const range = active.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return
    const text = active.toString().trim()
    if (!text) return
    const rect = range.getBoundingClientRect()
    const node = range.startContainer.nodeType === 1
      ? range.startContainer as Element
      : range.startContainer.parentElement
    let blockIndex: number | null = null
    let offset = 0
    const container = contentRef.current
    if (container?.contains(range.commonAncestorContainer)) {
      const anchor = selectionAnchor(range, container)
      if (anchor) {
        blockIndex = anchor.blockIndex
        offset = anchor.offset
      }
    } else if (node?.closest?.('.dsh-readpilot-pdf-text')) {
      const span = node?.closest?.('[data-offset]') as HTMLElement | null
      if (span) {
        const raw = active.toString()
        const leading = raw.length - raw.trimStart().length
        const before = range.cloneRange()
        before.selectNodeContents(span)
        before.setEnd(range.startContainer, range.startOffset)
        blockIndex = 0
        offset = (Number(span.getAttribute('data-offset')) || 0) + before.toString().length + leading
      }
    }
    if (blockIndex === null) return
    setSelection({
      text: text.slice(0, 2000),
      x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
      y: rect.top,
      blockIndex,
      offset,
    })
  }, [])

  React.useEffect(() => {
    const onUp = (event: MouseEvent) => {
      window.setTimeout(() => captureSelection(event.target), 10)
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [captureSelection])

  return {
    book,
    screen,
    setScreen,
    mode,
    setMode,
    loading,
    error,
    setError,
    anchor,
    setAnchor,
    selection,
    setSelection,
    anchorTokenRef,
    progressSkipRef,
    palette,
    contentRef,
    rootRef,
    visualBookRef,
    selectChapter,
  }
}
