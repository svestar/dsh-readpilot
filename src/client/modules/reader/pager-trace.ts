import type { AnchorTarget, PageGeometry } from './paging-model.ts'

/** 临时诊断：记录翻页/测量轨迹，定位跳页后移除。 */
export function tracePager(event: string, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const target = window as unknown as { __readpilotPagerTrace?: string[] }
  const list = target.__readpilotPagerTrace ?? (target.__readpilotPagerTrace = [])
  list.push(`${Date.now()} ${event} ${JSON.stringify(payload)}`)
  if (list.length > 400) list.splice(0, list.length - 400)
}

export function traceAnchor(anchor: AnchorTarget | null): unknown {
  if (!anchor) return null
  if (anchor.kind !== 'point') return { kind: anchor.kind, chapter: anchor.chapterId }
  return {
    kind: 'point',
    chapter: anchor.chapterId,
    block: anchor.blockIndex,
    fraction: Number(anchor.blockFraction.toFixed(3)),
    part: anchor.part ?? 'source',
  }
}

export function traceGeometry(geometry: PageGeometry | null): Record<string, unknown> {
  const blocks = geometry?.blocks ?? []
  let maxLeft = 0
  let last: Record<string, unknown> | null = null
  for (const block of blocks) {
    for (const rect of block.rects) {
      if (rect.left > maxLeft) maxLeft = rect.left
      last = {
        block: block.index,
        left: Math.round(rect.left),
        height: Math.round(rect.height),
        part: rect.part ?? 'source',
      }
    }
  }
  return { blocks: blocks.length, maxLeft: Math.round(maxLeft), last }
}
