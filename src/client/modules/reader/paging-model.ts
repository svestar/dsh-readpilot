import { PAGE_GAP, clampPageIndex } from './paging.ts'
import type { PageMetrics } from './paging.ts'

/** 原文与译文是同一阅读位置的两个部分；译文节点没有 data-block-index。 */
export type AnchorPart = 'source' | 'translation'

/** 一个块（或其译文）在内容坐标里的一个栏片段。 */
export interface BlockRect {
  part?: AnchorPart
  left: number
  top: number
  width: number
  height: number
}

export interface BlockGeometry {
  index: number
  rects: BlockRect[]
}

/** 一次布局测量得到的块矩形快照，翻页期间不再读 DOM。 */
export interface PageGeometry {
  blocks: BlockGeometry[]
}

/** 把分页度量换算成锚点投影需要的栏信息。 */
export interface LayoutInfo {
  columns: number
  columnWidth: number
  pitch: number
  pageCount: number
}

/**
 * 阅读位置。point 用块和块内高度比例表示；start/end 是章首/章末的显式锚点。
 * 页码永远由锚点 + 当前布局投影得到，不能反过来当作位置保存。
 */
export type AnchorTarget =
  | { kind: 'point'; chapterId: string; blockIndex: number; blockFraction: number; part?: AnchorPart }
  | { kind: 'chapterStart'; chapterId: string }
  | { kind: 'chapterEnd'; chapterId: string }

export interface TurnInput {
  page: number
  pageCount: number
  delta: number
  previousChapterId: string | null
  nextChapterId: string | null
}

export type TurnResult =
  | { kind: 'page'; page: number }
  | { kind: 'chapter'; chapterId: string; edge: 'start' | 'end' }

export function layoutInfoOf(metrics: PageMetrics): LayoutInfo {
  const columns = Math.max(1, Math.floor(metrics.columns) || 1)
  const columnWidth = Math.max(1, metrics.columnWidth)
  const pitch = metrics.stride > 0 ? metrics.stride / columns : columnWidth + PAGE_GAP
  return {
    columns,
    columnWidth,
    pitch: Math.max(1, pitch),
    pageCount: Math.max(1, Math.floor(metrics.pageCount) || 1),
  }
}

function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function rectPart(rect: BlockRect): AnchorPart {
  return rect.part === 'translation' ? 'translation' : 'source'
}

function partRects(block: BlockGeometry, part: AnchorPart): BlockRect[] {
  const rects = block.rects.filter(rect => rectPart(rect) === part)
  // 译文被关闭或尚未加载时，退回原文片段，避免位置直接掉到章首。
  return rects.length > 0 ? rects : block.rects
}

function rectsHeight(rects: readonly BlockRect[]): number {
  return rects.reduce((sum, rect) => sum + Math.max(0, rect.height), 0)
}

function columnOfX(x: number, pitch: number): number {
  if (!(pitch > 0)) return 0
  return Math.max(0, Math.round(x / pitch))
}

/** 锚点在当前布局里落到哪一页。几何缺失时退回首页，由调用方决定是否保留旧页。 */
export function pageOfAnchor(
  geometry: PageGeometry | null,
  anchor: AnchorTarget | null,
  layout: LayoutInfo,
): number {
  if (!anchor) return 0
  if (anchor.kind === 'chapterStart') return 0
  if (anchor.kind === 'chapterEnd') return layout.pageCount - 1
  const blocks = geometry?.blocks ?? []
  let block = blocks.find(item => item.index === anchor.blockIndex) ?? null
  if (!block) {
    // 空块或旧锚点可能不在几何快照里，退回最近的前一个块而不是章首。
    for (const item of blocks) {
      if (item.index > anchor.blockIndex) break
      block = item
    }
    block ??= blocks[0] ?? null
  }
  if (!block || block.rects.length === 0) return 0
  const rects = partRects(block, anchor.part === 'translation' ? 'translation' : 'source')
  const total = rectsHeight(rects)
  if (total <= 0) return 0
  let remaining = clampFraction(anchor.blockFraction) * total
  let column = 0
  for (const rect of rects) {
    const height = Math.max(0, rect.height)
    if (height <= 0) continue
    column = columnOfX(rect.left, layout.pitch)
    if (remaining < height) break
    remaining -= height
  }
  return clampPageIndex(Math.floor(column / layout.columns), layout.pageCount)
}

/**
 * 某一页开头对应的内容锚点。页首是章首时直接返回 chapterStart，
 * 这样章节标题始终留在第一页。
 */
export function anchorAtPage(
  geometry: PageGeometry | null,
  page: number,
  layout: LayoutInfo,
  chapterId: string,
): AnchorTarget {
  const target = clampPageIndex(page, layout.pageCount)
  if (target <= 0) return { kind: 'chapterStart', chapterId }
  const pageStart = target * layout.columns * layout.pitch
  const pageEnd = pageStart + layout.columns * layout.pitch
  for (const block of geometry?.blocks ?? []) {
    const before: Record<AnchorPart, number> = { source: 0, translation: 0 }
    for (const rect of block.rects) {
      const part = rectPart(rect)
      const right = rect.left + rect.width
      if (rect.left < pageEnd && right > pageStart) {
        const total = rectsHeight(partRects(block, part))
        const fraction = total > 0 ? before[part] / total : 0
        return {
          kind: 'point',
          chapterId,
          blockIndex: block.index,
          blockFraction: clampFraction(fraction),
          ...(part === 'translation' ? { part } : {}),
        }
      }
      if (right <= pageStart) before[part] += Math.max(0, rect.height)
    }
    const first = block.rects[0]
    if (first && first.left >= pageEnd) {
      return {
        kind: 'point',
        chapterId,
        blockIndex: block.index,
        blockFraction: 0,
        ...(rectPart(first) === 'translation' ? { part: 'translation' as const } : {}),
      }
    }
  }
  return { kind: 'chapterEnd', chapterId }
}

/** 同章翻页走 page ± 1；越界时把目标表达成邻章的章首/章末锚点。 */
export function turnTarget(input: TurnInput): TurnResult | null {
  const count = Math.max(1, Math.floor(input.pageCount) || 1)
  const page = clampPageIndex(input.page, count)
  if (input.delta > 0) {
    if (page < count - 1) return { kind: 'page', page: page + 1 }
    return input.nextChapterId
      ? { kind: 'chapter', chapterId: input.nextChapterId, edge: 'start' }
      : null
  }
  if (input.delta < 0) {
    if (page > 0) return { kind: 'page', page: page - 1 }
    return input.previousChapterId
      ? { kind: 'chapter', chapterId: input.previousChapterId, edge: 'end' }
      : null
  }
  return null
}

function textWeights(blocks: ReadonlyArray<{ text?: string }> | null | undefined): number[] {
  return (blocks ?? []).map(block => Math.max(1, (block.text ?? '').length))
}

function weightTotal(weights: readonly number[]): number {
  return weights.reduce((sum, weight) => sum + weight, 0)
}

/** 章节内比例 → 块锚点。比例 0/1 直接是章首/章末。 */
export function anchorOfFraction(
  chapterId: string,
  blocks: ReadonlyArray<{ text?: string }> | null | undefined,
  fraction: number,
): AnchorTarget {
  const value = clampFraction(fraction)
  if (value <= 0) return { kind: 'chapterStart', chapterId }
  if (value >= 1) return { kind: 'chapterEnd', chapterId }
  const weights = textWeights(blocks)
  const total = weightTotal(weights)
  if (total <= 0) return { kind: 'chapterEnd', chapterId }
  const target = value * total
  let before = 0
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index]
    if (target < before + weight || index === weights.length - 1) {
      return {
        kind: 'point',
        chapterId,
        blockIndex: index,
        blockFraction: clampFraction((target - before) / weight),
      }
    }
    before += weight
  }
  return { kind: 'chapterEnd', chapterId }
}

/** 块锚点 → 章节内比例；比例只用于持久化和全书百分比。 */
export function fractionOfAnchor(
  anchor: AnchorTarget,
  blocks: ReadonlyArray<{ text?: string }> | null | undefined,
): number {
  if (anchor.kind === 'chapterStart') return 0
  if (anchor.kind === 'chapterEnd') return 1
  const weights = textWeights(blocks)
  const total = weightTotal(weights)
  if (total <= 0) return 0
  let before = 0
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index]
    if (index === anchor.blockIndex) {
      // 译文跟在源块之后，进度记到源块末尾；用块内比例会把译文页算回块起点。
      const within = anchor.part === 'translation'
        ? weight
        : clampFraction(anchor.blockFraction) * weight
      return clampFraction((before + within) / total)
    }
    before += weight
  }
  return 0
}
