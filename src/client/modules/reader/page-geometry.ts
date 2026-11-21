import type { AnchorPart, BlockGeometry, BlockRect, PageGeometry } from './paging-model.ts'

function contentOrigin(container: HTMLElement): { left: number; top: number } {
  const bounds = container.getBoundingClientRect()
  const style = container.ownerDocument?.defaultView?.getComputedStyle(container)
  const borderLeft = Number.parseFloat(style?.borderLeftWidth ?? '') || 0
  const borderTop = Number.parseFloat(style?.borderTopWidth ?? '') || 0
  const paddingLeft = Number.parseFloat(style?.paddingLeft ?? '') || 0
  const paddingTop = Number.parseFloat(style?.paddingTop ?? '') || 0
  return {
    left: bounds.left + borderLeft + paddingLeft,
    top: bounds.top + borderTop + paddingTop,
  }
}

/**
 * 一次布局测量后抓取块矩形快照。矩形统一换算到内容坐标，
 * 之后翻页和重排都用快照换算锚点，不再重复读 DOM。
 */
export function readPageGeometry(container: HTMLElement | null): PageGeometry {
  if (!container) return { blocks: [] }
  const origin = contentOrigin(container)
  const scrollLeft = Number.isFinite(container.scrollLeft) ? container.scrollLeft : 0
  const byIndex = new Map<number, BlockGeometry>()
  // 译文节点是原文块的兄弟节点，不带 data-block-index；按块索引合并才能给仅译文页定位。
  for (const element of container.querySelectorAll<HTMLElement>('[data-block-index], [data-translation-index]')) {
    const sourceIndex = element.getAttribute('data-block-index')
    const index = Number(sourceIndex ?? element.getAttribute('data-translation-index'))
    if (!Number.isInteger(index) || index < 0) continue
    const part: AnchorPart = sourceIndex === null ? 'translation' : 'source'
    const rects = [...element.getClientRects()]
      .filter(rect => rect.width > 0.5 && rect.height > 0.5)
      .map(rect => {
        const item: BlockRect = {
          left: rect.left - origin.left + scrollLeft,
          top: rect.top - origin.top,
          width: rect.width,
          height: rect.height,
        }
        if (part === 'translation') item.part = 'translation'
        return item
      })
      .sort((left, right) => left.left - right.left || left.top - right.top)
    if (rects.length === 0) continue
    const block = byIndex.get(index) ?? { index, rects: [] }
    block.rects.push(...rects)
    byIndex.set(index, block)
  }
  return { blocks: [...byIndex.values()].sort((left, right) => left.index - right.index) }
}
