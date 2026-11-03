export type PageLayout = 'single' | 'double'
export type ReaderMode = 'scroll' | 'paged'

export const PAGE_GAP = 40
export const PAGE_ASPECT = 210 / 297

export function columnsFor(layout: PageLayout): number {
  return layout === 'double' ? 2 : 1
}

export interface PageMetrics {
  columns: number
  columnWidth: number
  totalColumns: number
  pageCount: number
  stride: number
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function validGap(gap: number): number {
  return Number.isFinite(gap) && gap >= 0 ? gap : PAGE_GAP
}

export function measurePageMetrics(viewportWidth: number, scrollWidth: number, layout: PageLayout, gap = PAGE_GAP): PageMetrics {
  const columns = columnsFor(layout)
  const g = validGap(gap)
  const width = finiteOrZero(viewportWidth)
  const content = finiteOrZero(scrollWidth)
  const columnWidth = Math.max(1, (width - g * (columns - 1)) / columns)
  const stride = columns * (columnWidth + g)
  if (content <= width + 0.5) {
    return { columns, columnWidth, totalColumns: 1, pageCount: 1, stride }
  }
  const totalColumns = Math.max(1, Math.round((content + g) / (columnWidth + g)))
  const pageCount = Math.max(1, Math.ceil(totalColumns / columns))
  return { columns, columnWidth, totalColumns, pageCount, stride }
}

export function pageBounds(pageIndex: number, layout: PageLayout, totalColumns: number): { start: number; end: number } {
  const columns = columnsFor(layout)
  const total = Number.isFinite(totalColumns) && totalColumns >= 1 ? Math.floor(totalColumns) : 1
  const pageCount = Math.max(1, Math.ceil(total / columns))
  const index = clampPageIndex(pageIndex, pageCount)
  const start = index * columns + 1
  const end = Math.min(start + columns - 1, total)
  return { start, end }
}

export function clampPageIndex(pageIndex: number, pageCount: number): number {
  const count = Number.isFinite(pageCount) ? Math.floor(pageCount) : 0
  if (count < 1) return 0
  const index = Number.isFinite(pageIndex) ? Math.floor(pageIndex) : 0
  if (index < 0) return 0
  return Math.min(index, count - 1)
}

export function pageStep(layout: PageLayout): number {
  return columnsFor(layout)
}

export function pageWidthForHeight(height: number, availableWidth: number, ratio = PAGE_ASPECT): number {
  const h = finiteOrZero(height)
  const available = finiteOrZero(availableWidth)
  const r = finiteOrZero(ratio)
  if (h <= 0 || available <= 0 || r <= 0) return 0
  return Math.min(available, h * r)
}
