import { React } from '../../runtime.ts'
import {
  PAGE_GAP,
  clampPageIndex,
  columnsFor,
  measurePageMetrics,
} from './paging.ts'
import {
  anchorAtPage,
  anchorOfFraction,
  fractionOfAnchor,
  layoutInfoOf,
  pageOfAnchor,
  turnTarget,
} from './paging-model.ts'
import { readPageGeometry } from './page-geometry.ts'
import type { PageLayout, ReadingAnchor } from './paging.ts'
import type { AnchorTarget, LayoutInfo, PageGeometry } from './paging-model.ts'
import type { MutableRef, Screen, SelectChapter } from '../../lib/types.ts'

const WHEEL_THRESHOLD = 40

export interface TextPagerOptions {
  enabled: boolean
  layout: PageLayout
  screen: Screen
  fontSize: number
  pageWidth?: number
  anchor?: ReadingAnchor | null
  selectChapter: SelectChapter
}

export interface TextPager {
  frameRef: (node: HTMLDivElement | null) => void
  innerRef: MutableRef<HTMLDivElement | null>
  innerStyle: Record<string, string | number>
  page: number
  pageCount: number
  pageStart: number
  pageEnd: number
  pageTotal: number
  canPrev: boolean
  canNext: boolean
  goPage: (delta: number) => void
  goToBlock: (blockIndex: number, blockFraction?: number) => void
  notifyLayout: () => void
  anchor: AnchorTarget | null
  boundary: 'start' | 'end' | null
  chapterFraction: number
  layoutReady: boolean
}

/**
 * 文本分页器。位置只保存在 anchor 里，page 是 anchor 在当前布局上的投影；
 * 译文、字号、页宽或窗口变化都会重测布局，但不会改变屏幕上的首段内容。
 */
export function useTextPager({
  enabled,
  layout,
  screen,
  fontSize,
  pageWidth = 0,
  anchor,
  selectChapter,
}: TextPagerOptions): TextPager {
  const [page, setPage] = React.useState(0)
  const [pageCount, setPageCount] = React.useState(1)
  const [layoutReady, setLayoutReady] = React.useState(false)
  const [layoutTick, setLayoutTick] = React.useState(0)
  const [anchorState, setAnchorState] = React.useState<AnchorTarget | null>(null)
  // 页框会在切换/加载时卸载重挂；用 callback ref 把新节点交给滚轮 effect，避免监听留在旧节点上。
  const [frameNode, setFrameNode] = React.useState<HTMLDivElement | null>(null)
  const frameRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node) setFrameNode(node)
  }, [])
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const anchorRef = React.useRef<AnchorTarget | null>(null)
  const geometryRef = React.useRef<PageGeometry | null>(null)
  const metricsRef = React.useRef<LayoutInfo | null>(null)
  const pendingTurnRef = React.useRef<{ chapterId: string; edge: 'start' | 'end' } | null>(null)
  const appliedAnchorRef = React.useRef(0)
  // 同步的就绪守卫：布局变化后到新快照落定前，滚轮/键盘翻页必须被忽略。
  const readyRef = React.useRef(false)
  const lastSignatureRef = React.useRef('')

  const active = enabled && screen.kind === 'book'
  const chapterId = screen.kind === 'book' ? screen.content.chapterId : ''
  const bookId = screen.kind === 'book' ? screen.detail.book.id : ''
  const blocks = screen.kind === 'book' ? screen.content.blocks : []
  const toc = screen.kind === 'book' ? screen.detail.toc : []
  const chapterIndex = toc.findIndex(item => item.id === chapterId)
  const prevChapter = chapterIndex > 0 ? toc[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex + 1 < toc.length ? toc[chapterIndex + 1] : null

  const notifyLayout = React.useCallback(() => {
    readyRef.current = false
    setLayoutReady(false)
    setLayoutTick(value => value + 1)
  }, [])

  const scrollToPage = React.useCallback((pageIndex: number, info: LayoutInfo) => {
    const inner = innerRef.current
    if (!inner) return
    const maxLeft = Math.max(0, inner.scrollWidth - inner.clientWidth)
    const stride = info.pitch * info.columns
    const left = Math.min(clampPageIndex(pageIndex, info.pageCount) * stride, maxLeft)
    if (Math.abs(inner.scrollLeft - left) > 1) inner.scrollLeft = left
  }, [])

  // 章节切换先落章首；跨章回翻的待处理意图在校验章节后改成章末锚点。
  React.useEffect(() => {
    if (!active) {
      pendingTurnRef.current = null
      anchorRef.current = null
      geometryRef.current = null
      metricsRef.current = null
      readyRef.current = false
      setAnchorState(null)
      setPage(0)
      setPageCount(1)
      setLayoutReady(false)
      return
    }
    const pending = pendingTurnRef.current
    pendingTurnRef.current = null
    const next: AnchorTarget = pending && pending.chapterId === chapterId
      ? { kind: pending.edge === 'start' ? 'chapterStart' : 'chapterEnd', chapterId }
      : { kind: 'chapterStart', chapterId }
    anchorRef.current = next
    geometryRef.current = null
    metricsRef.current = null
    readyRef.current = false
    setAnchorState(next)
    setPage(0)
    setPageCount(1)
    setLayoutReady(false)
    if (innerRef.current) innerRef.current.scrollLeft = 0
  }, [active, bookId, chapterId])

  // 外部锚点（重开书、设置切换、聊天跳转）按章节字重转成块锚点。
  React.useEffect(() => {
    if (!active || !anchor) return
    if (anchor.token === appliedAnchorRef.current) return
    if (anchor.chapterId !== chapterId) return
    appliedAnchorRef.current = anchor.token
    const next = anchorOfFraction(chapterId, blocks, anchor.fraction)
    anchorRef.current = next
    setAnchorState(next)
    setLayoutTick(value => value + 1)
  }, [active, anchor, anchor?.token, blocks, chapterId])

  React.useEffect(() => {
    if (!active) return
    const inner = innerRef.current
    if (!inner) return
    // 布局输入变化后先冻结翻页，等新快照落定再按锚点重算页码。
    readyRef.current = false
    setLayoutReady(false)
    const view = typeof window === 'undefined' ? null : window
    let rafId = 0

    const measure = () => {
      rafId = 0
      if (!inner.isConnected) return
      // 多栏按小数宽度排版，clientWidth 会取整；用计算宽度测量避免每页偏移半像素。
      const usedWidth = view ? Number.parseFloat(view.getComputedStyle(inner).width) : Number.NaN
      const width = Number.isFinite(usedWidth) && usedWidth > 0 ? usedWidth : inner.clientWidth
      const height = inner.clientHeight
      if (width <= 0 || height <= 0) return
      const metrics = measurePageMetrics(width, inner.scrollWidth, layout, PAGE_GAP)
      const info = layoutInfoOf(metrics)
      const geometry = readPageGeometry(inner)
      geometryRef.current = geometry
      metricsRef.current = info
      const current = anchorRef.current
      const nextPage = current && current.chapterId === chapterId
        ? pageOfAnchor(geometry, current, info)
        : 0
      setPageCount(info.pageCount)
      setPage(nextPage)
      scrollToPage(nextPage, info)
      // 连续两次测量一致才认为布局落定；面板恢复或译文到达时页数可能还在变。
      const signature = `${width}|${height}|${inner.scrollWidth}|${info.pageCount}|${info.pitch}`
      const settled = lastSignatureRef.current === signature
      lastSignatureRef.current = signature
      if (!settled) {
        readyRef.current = false
        setLayoutReady(false)
        schedule()
        return
      }
      readyRef.current = true
      setLayoutReady(true)
    }

    const schedule = () => {
      if (rafId) return
      readyRef.current = false
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(measure)
        return
      }
      measure()
    }

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule)
      observer.observe(inner)
    }
    const images = [...inner.querySelectorAll('img')].filter(image => !image.complete)
    for (const image of images) image.addEventListener('load', schedule, { once: true })
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(schedule).catch(() => {})
    }
    view?.addEventListener('resize', schedule)
    schedule()
    // 面板恢复时可能在页宽稳定前测量，重试几次避免页数卡在 1。
    const timers = [80, 240, 600, 1200].map(delay => view?.setTimeout(schedule, delay))

    return () => {
      if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
      observer?.disconnect()
      for (const image of images) image.removeEventListener('load', schedule)
      view?.removeEventListener('resize', schedule)
      for (const timer of timers) {
        if (timer !== undefined) view?.clearTimeout(timer)
      }
    }
  }, [active, chapterId, fontSize, frameNode, layout, layoutTick, pageWidth, scrollToPage])

  const goPage = React.useCallback((delta: number) => {
    if (!active || delta === 0 || !readyRef.current || pendingTurnRef.current) return
    const info = metricsRef.current
    if (!info) return
    const current = pageOfAnchor(geometryRef.current, anchorRef.current, info)
    const target = turnTarget({
      page: current,
      pageCount: info.pageCount,
      delta,
      previousChapterId: prevChapter?.id ?? null,
      nextChapterId: nextChapter?.id ?? null,
    })
    if (!target) return
    if (target.kind === 'page') {
      const next = anchorAtPage(geometryRef.current, target.page, info, chapterId)
      anchorRef.current = next
      setAnchorState(next)
      setPage(target.page)
      scrollToPage(target.page, info)
      return
    }
    const pending = { chapterId: target.chapterId, edge: target.edge }
    pendingTurnRef.current = pending
    void selectChapter(bookId, target.chapterId).then(ok => {
      // 切章失败时保留原章节，恢复可翻页状态。
      if (!ok && pendingTurnRef.current === pending) {
        pendingTurnRef.current = null
        readyRef.current = true
        setLayoutReady(true)
      }
    })
  }, [active, bookId, chapterId, nextChapter?.id, prevChapter?.id, scrollToPage, selectChapter])

  const goToBlock = React.useCallback((blockIndex: number, blockFraction = 0) => {
    if (!active || !Number.isInteger(blockIndex) || blockIndex < 0) return
    const next: AnchorTarget = {
      kind: 'point',
      chapterId,
      blockIndex,
      blockFraction: Math.max(0, Math.min(1, blockFraction)),
    }
    anchorRef.current = next
    setAnchorState(next)
    const info = metricsRef.current
    const geometry = geometryRef.current
    if (info && geometry?.blocks.some(block => block.index === blockIndex)) {
      const target = pageOfAnchor(geometry, next, info)
      setPage(target)
      scrollToPage(target, info)
      return
    }
    setLayoutTick(value => value + 1)
  }, [active, chapterId, scrollToPage])

  React.useEffect(() => {
    if (!enabled || !frameNode) return
    let accumulated = 0
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      accumulated += event.deltaY
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return
      // 布局测量期间保留累计量，等快照落定后下一次滚轮再翻页。
      if (!readyRef.current || pendingTurnRef.current) return
      const direction = accumulated > 0 ? 1 : -1
      accumulated = 0
      goPage(direction)
    }
    frameNode.addEventListener('wheel', onWheel, { passive: false })
    return () => frameNode.removeEventListener('wheel', onWheel)
  }, [enabled, frameNode, goPage])

  const innerStyle = React.useMemo<Record<string, string | number>>(() => ({
    height: '100%',
    width: '100%',
    maxWidth: 'none',
    margin: '0',
    overflow: 'hidden',
    columnCount: columnsFor(layout),
    columnGap: `${PAGE_GAP}px`,
    columnFill: 'auto',
  }), [layout])

  const chapterFraction = React.useMemo(
    () => active && anchorState && anchorState.chapterId === chapterId
      ? fractionOfAnchor(anchorState, blocks)
      : 0,
    [active, anchorState, blocks, chapterId],
  )
  const boundary = active && anchorState && anchorState.chapterId === chapterId
    ? anchorState.kind === 'chapterEnd'
      ? 'end' as const
      : anchorState.kind === 'chapterStart'
        ? 'start' as const
        : null
    : null
  const safePage = active ? clampPageIndex(page, pageCount) : 0
  const count = active ? pageCount : 1
  const ready = active && layoutReady
  const canPrev = ready && (safePage > 0 || prevChapter !== null)
  const canNext = ready && (safePage < count - 1 || nextChapter !== null)

  return {
    frameRef,
    innerRef,
    innerStyle,
    page: safePage,
    pageCount: count,
    pageStart: safePage + 1,
    pageEnd: safePage + 1,
    pageTotal: count,
    canPrev,
    canNext,
    goPage,
    goToBlock,
    notifyLayout,
    anchor: anchorState,
    boundary,
    chapterFraction,
    layoutReady: ready,
  }
}
