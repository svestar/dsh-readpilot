/** Geometry helpers shared by inline bilingual rendering in the main and sidebar readers. */
export function visibleBlockIndices(container: HTMLElement | null): Set<number> {
  const visible = new Set<number>()
  if (!container) return visible
  const bounds = container.getBoundingClientRect()
  for (const element of container.querySelectorAll<HTMLElement>('[data-block-index]')) {
    const rect = element.getBoundingClientRect()
    if (rect.bottom <= bounds.top + 4 || rect.top >= bounds.bottom - 4) continue
    if (rect.right <= bounds.left + 4 || rect.left >= bounds.right - 4) continue
    const index = Number(element.getAttribute('data-block-index'))
    if (Number.isInteger(index) && index >= 0) visible.add(index)
  }
  return visible
}
