import type { BlockGeometry, PageGeometry } from './paging-model.ts'

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
  const blocks: BlockGeometry[] = []
  for (const element of container.querySelectorAll<HTMLElement>('[data-block-index]')) {
    const index = Number(element.getAttribute('data-block-index'))
    if (!Number.isInteger(index) || index < 0) continue
    const rects = [...element.getClientRects()]
      .filter(rect => rect.width > 0.5 && rect.height > 0.5)
      .map(rect => ({
        left: rect.left - origin.left + scrollLeft,
        top: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      }))
      .sort((left, right) => left.left - right.left || left.top - right.top)
    if (rects.length > 0) blocks.push({ index, rects })
  }
  blocks.sort((left, right) => left.index - right.index)
  return { blocks }
}
