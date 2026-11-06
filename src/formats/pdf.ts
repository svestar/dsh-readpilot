import { basename, extname } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { Chapter, OutlineEntry, ParsedBook, TextBlock } from '../formats.ts'

const MAX_PAGES = 2000
const LINE_Y_TOLERANCE = 2
// 相邻行基线间距超过约两倍字号时，视为空行分段。
const PARAGRAPH_GAP_FACTOR = 2
const PAGE_NUMBER_PATTERN = /^(?:\d{1,4}|第\s*\d+\s*页|\d+\s*\/\s*\d+)$/
const MONO_FONT_PATTERN = /mono|courier|consolas|menlo|monaco|code/i
const TOC_LEADER_PATTERN = /(?:\.[ \t]*){4,}|…{3,}/

interface PdfLineItem {
  text: string
  x: number
  y: number
  size: number
  width: number
  mono: boolean
}

interface PdfLine {
  y: number
  size: number
  x: number
  endX: number
  items: PdfLineItem[]
  text?: string
  mono: boolean
}

interface PdfPageData {
  number: number
  width: number
  height: number
  lines: PdfLine[]
}

function metadataText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

async function readOutline(pdf: any): Promise<OutlineEntry[]> {
  let raw: any
  try {
    raw = await pdf.getOutline()
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const entries: OutlineEntry[] = []
  const visit = async (items: any[], level: number): Promise<void> => {
    for (const item of items) {
      if (entries.length >= 500) break
      const title = metadataText(item?.title)
      if (title) {
        let page: number | null = null
        try {
          const destination = typeof item.dest === 'string'
            ? await pdf.getDestination(item.dest)
            : item.dest
          if (Array.isArray(destination) && destination[0]) {
            const index = await pdf.getPageIndex(destination[0])
            if (Number.isInteger(index) && index >= 0) page = index + 1
          }
        } catch {
          page = null
        }
        if (page) {
          entries.push({
            id: `o${String(entries.length + 1).padStart(3, '0')}`,
            title,
            level,
            page,
          })
        }
      }
      if (Array.isArray(item?.items) && item.items.length > 0) {
        await visit(item.items, level + 1)
      }
    }
  }
  await visit(raw, 0)
  return entries
}

function collectItems(content: any): PdfLineItem[] {
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

function groupLines(items: PdfLineItem[]): PdfLine[] {
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
  }
  return lines
}

/** Reorder a two-column page: left column first, then right. */
function orderColumns(lines: PdfLine[], width: number): PdfLine[] {
  if (lines.length < 8) return lines
  const mid = width / 2
  const left = lines.filter(line => line.endX <= mid + 4)
  const right = lines.filter(line => line.x >= mid - 4)
  if (left.length < 3 || right.length < 3) return lines
  if (left.length + right.length < lines.length * 0.8) return lines
  return [...left, ...right]
}

function furnitureKey(text: string): string {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Drop page numbers and running headers/footers repeated across pages. */
function stripPageFurniture(pages: PdfPageData[]): void {
  const counts = new Map<string, number>()
  for (const page of pages) {
    if (page.number === 1) continue
    const seen = new Set<string>()
    for (const line of page.lines) {
      const top = line.y > page.height * 0.88
      const bottom = line.y < page.height * 0.12
      if (!top && !bottom) continue
      const key = furnitureKey(line.text ?? '')
      if (!key || seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const threshold = Math.max(3, Math.ceil((pages.length - 1) * 0.5))
  for (const page of pages) {
    if (page.number === 1) continue
    for (const line of page.lines) {
      const top = line.y > page.height * 0.88
      const bottom = line.y < page.height * 0.12
      if (!top && !bottom) continue
      const text = (line.text ?? '').trim()
      if (!text) continue
      if (PAGE_NUMBER_PATTERN.test(text)) {
        line.text = ''
        continue
      }
      const key = furnitureKey(text)
      if ((counts.get(key) ?? 0) >= threshold && key.length <= 80) line.text = ''
    }
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function looksLikeTocPage(lines: PdfLine[]): boolean {
  const text = lines.filter(line => line.text)
  if (text.length < 5) return false
  const entries = text.filter(line => TOC_LEADER_PATTERN.test(line.text ?? '')
    || /^\\d+(?:\\.\\d+)*\\s+.+\\s+\\d{1,4}$/.test(line.text ?? '')).length
  return entries >= text.length * 0.4
}

function pageBlocks(lines: PdfLine[]): TextBlock[] {
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
    if (line.mono) {
      const nextMono = Boolean(lines[index + 1]?.mono && lines[index + 1]?.text)
      if (code.length > 0 || nextMono) {
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

export async function parsePdf(buffer: Buffer, filePath: string): Promise<ParsedBook> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  } as any)

  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDF 页数超过 ${MAX_PAGES} 页上限（共 ${pdf.numPages} 页）`)
    }
    const metadata: any = await pdf.getMetadata()
    const info = metadata?.info ?? {}
    const title = metadataText(info.Title) || basename(filePath, extname(filePath))
    const author = metadataText(info.Author)
    const outline = await readOutline(pdf)
    const pages: PdfPageData[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const view = page.view ?? [0, 0, 612, 792]
      const width = Math.max(1, Math.abs(view[2] - view[0]))
      const height = Math.max(1, Math.abs(view[3] - view[1]))
      const content = await page.getTextContent()
      const lines = groupLines(collectItems(content))
      if (lines.length === 0) continue
      pages.push({ number: pageNumber, width, height, lines })
    }

    stripPageFurniture(pages)
    const chapters: Chapter[] = []
    for (const page of pages) {
      if (looksLikeTocPage(page.lines)) continue
      const blocks = pageBlocks(orderColumns(page.lines, page.width))
      if (blocks.length === 0) continue
      chapters.push({
        id: `c${String(chapters.length + 1).padStart(3, '0')}`,
        title: `第 ${page.number} 页`,
        page: page.number,
        blocks,
        chars: blocks.map(block => block.text).join('\n\n').length,
      })
    }

    return {
      title,
      author,
      chapters,
      outline,
      chars: chapters.reduce((sum, chapter) => sum + chapter.chars, 0),
    }
  } finally {
    await loadingTask.destroy()
  }
}
