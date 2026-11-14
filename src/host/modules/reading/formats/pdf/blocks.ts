import type { TextBlock } from '../../../../../shared/contracts/reading.ts'
import { isCodeLine, median } from './cleanup.ts'
import type { PdfLine } from './types.ts'
import { PARAGRAPH_GAP_FACTOR, TOC_LEADER_PATTERN } from './types.ts'

function tableRowsAt(lines: PdfLine[], index: number): { rows: string[][]; count: number } | null {
  const first = lines[index]
  if (!first?.text || isCodeLine(first)) return null
  const base = first.cells ?? []
  if (base.length < 2) return null
  const rows = [base.map(cell => cell.text)]
  let cursor = index + 1
  for (; cursor < lines.length; cursor += 1) {
    const line = lines[cursor]
    if (!line.text || isCodeLine(line)) break
    const cells = line.cells ?? []
    if (cells.length !== base.length) break
    if (cells.some((cell, column) => Math.abs(cell.x - base[column].x) > line.size * 2)) break
    rows.push(cells.map(cell => cell.text))
  }
  return rows.length >= 2 ? { rows, count: rows.length } : null
}

export function pageBlocks(lines: PdfLine[]): TextBlock[] {
  const blocks: TextBlock[] = []
  let paragraph: string[] = []
  let code: string[] = []
  let previous: PdfLine | null = null
  const bodySizes = lines.filter(line => line.text).map(line => line.size)
  const bodySize = median(bodySizes)

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim()
    if (text) blocks.push({ type: 'p', text })
    paragraph = []
  }
  const flushCode = () => {
    const text = code.join('\n').replace(/\s+$/, '')
    if (text.trim()) blocks.push({ type: 'code', text })
    code = []
  }
  const flush = () => {
    flushParagraph()
    flushCode()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.text) {
      flush()
      previous = null
      continue
    }
    if (TOC_LEADER_PATTERN.test(line.text)) {
      flushParagraph()
      previous = null
      continue
    }
    const table = tableRowsAt(lines, index)
    if (table) {
      flush()
      blocks.push({
        type: 'table',
        text: table.rows.map(row => row.join(' | ')).join('\n'),
        rows: table.rows,
      })
      previous = null
      index += table.count - 1
      continue
    }
    if (isCodeLine(line)) {
      const nextCode = Boolean(lines[index + 1]?.text && isCodeLine(lines[index + 1]))
      if (code.length > 0 || nextCode) {
        flushParagraph()
        code.push(line.text)
        previous = line
        continue
      }
    }
    flushCode()
    const heading = bodySizes.length > 2
      && line.size >= bodySize * 1.35
      && line.text.length <= 60
      && !/[。！？；]$/.test(line.text)
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'h', level: 2, text: line.text })
      previous = null
      continue
    }
    if (previous) {
      const gap = previous.y - line.y
      const expected = ((previous.size + line.size) / 2) * PARAGRAPH_GAP_FACTOR
      if (gap > expected) flushParagraph()
    }
    paragraph.push(line.text)
    previous = line
  }
  flush()
  return blocks
}
