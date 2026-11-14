import type { PdfLine, PdfLineItem } from './types.ts'
import { LINE_Y_TOLERANCE, MONO_FONT_PATTERN } from './types.ts'

export function collectItems(content: any): PdfLineItem[] {
  const items: PdfLineItem[] = []
  const styles = content?.styles ?? {}
  for (const item of content.items) {
    if (typeof item?.str !== 'string' || item.str.length === 0) continue
    const transform = item.transform
    if (!transform || transform.length < 6) continue
    const x = transform[4]
    const y = transform[5]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const size = Math.hypot(transform[2], transform[3])
    const family = String(styles?.[item.fontName]?.fontFamily ?? '')
    items.push({
      text: item.str,
      x,
      y,
      size: Number.isFinite(size) && size > 0 ? size : 10,
      width: Number.isFinite(item.width) && item.width > 0 ? item.width : item.str.length * 5,
      mono: MONO_FONT_PATTERN.test(family),
    })
  }
  return items
}

export function groupLines(items: PdfLineItem[]): PdfLine[] {
  // PDF coordinates grow upwards, so a page reads from the highest y to the lowest.
  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x)
  const lines: PdfLine[] = []
  for (const item of sorted) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(current.y - item.y) <= LINE_Y_TOLERANCE) {
      current.items.push(item)
      current.size = Math.max(current.size, item.size)
      continue
    }
    lines.push({ y: item.y, size: item.size, x: item.x, endX: item.x + item.width, items: [item], mono: false })
  }
  for (const line of lines) {
    line.items.sort((left, right) => left.x - right.x)
    let text = ''
    let endX = line.x
    for (const item of line.items) {
      if (text && !/\s$/.test(text) && !/^\s/.test(item.text)) {
        const gap = item.x - endX
        if (gap > item.size * 0.18) text += ' '
      }
      text += item.text
      endX = Math.max(endX, item.x + item.width)
    }
    line.text = text.trim()
    line.x = Math.min(...line.items.map(item => item.x))
    line.endX = endX
    const monoInk = line.items.filter(item => item.mono).reduce((sum, item) => sum + item.text.trim().length, 0)
    const ink = line.items.reduce((sum, item) => sum + item.text.trim().length, 0)
    line.mono = ink > 0 && monoInk >= ink * 0.6
    const cells: Array<{ text: string; x: number }> = []
    let cell: { text: string; x: number } | null = null
    let cursor = line.x
    for (const item of line.items) {
      if (!item.text.trim()) {
        if (cell && item.width > item.size * 1.5) {
          cells.push({ text: cell.text.trim(), x: cell.x })
          cell = null
        }
        cursor = item.x + item.width
        continue
      }
      const gap = item.x - cursor
      if (cell && gap > Math.max(6, item.size * 1.2)) {
        cells.push({ text: cell.text.trim(), x: cell.x })
        cell = null
      }
      if (!cell) cell = { text: item.text, x: item.x }
      else cell.text += ` ${item.text}`
      cursor = item.x + item.width
    }
    if (cell) cells.push({ text: cell.text.trim(), x: cell.x })
    line.cells = cells.filter(entry => entry.text)
  }
  return lines
}

/** Reorder a two-column page: left column first, then right. */
export function orderColumns(lines: PdfLine[], width: number): PdfLine[] {
  if (lines.length < 8) return lines
  const mid = width / 2
  const left = lines.filter(line => line.endX <= mid + 4)
  const right = lines.filter(line => line.x >= mid - 4)
  if (left.length < 3 || right.length < 3) return lines
  if (left.length + right.length < lines.length * 0.8) return lines
  return [...left, ...right]
}
