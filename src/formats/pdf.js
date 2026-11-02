import { basename, extname } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const MAX_PAGES = 2000
const LINE_Y_TOLERANCE = 2
// 相邻行基线间距超过约两倍字号时，视为空行分段。
const PARAGRAPH_GAP_FACTOR = 2

function metadataText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

function collectItems(content) {
  const items = []
  for (const item of content.items) {
    if (typeof item?.str !== 'string' || item.str.length === 0) continue
    const transform = item.transform
    if (!transform || transform.length < 6) continue
    const x = transform[4]
    const y = transform[5]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const size = Math.hypot(transform[2], transform[3])
    items.push({
      text: item.str,
      x,
      y,
      size: Number.isFinite(size) && size > 0 ? size : 10,
    })
  }
  return items
}

function groupLines(items) {
  // PDF coordinates grow upwards, so a page reads from the highest y to the lowest.
  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x)
  const lines = []
  for (const item of sorted) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(current.y - item.y) <= LINE_Y_TOLERANCE) {
      current.items.push(item)
      current.size = Math.max(current.size, item.size)
      continue
    }
    lines.push({ y: item.y, size: item.size, items: [item] })
  }
  for (const line of lines) {
    line.items.sort((left, right) => left.x - right.x)
    line.text = line.items.map(item => item.text).join('').trim()
  }
  return lines
}

function pageBlocks(lines) {
  const blocks = []
  let paragraph = []
  let previous = null

  const flush = () => {
    const text = paragraph.join('\n').trim()
    if (text) blocks.push({ type: 'p', text })
    paragraph = []
  }

  for (const line of lines) {
    if (!line.text) {
      flush()
      previous = null
      continue
    }
    if (previous) {
      const gap = previous.y - line.y
      const expected = ((previous.size + line.size) / 2) * PARAGRAPH_GAP_FACTOR
      if (gap > expected) flush()
    }
    paragraph.push(line.text)
    previous = line
  }
  flush()
  return blocks
}

export async function parsePdf(buffer, filePath) {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  })

  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDF 页数超过 ${MAX_PAGES} 页上限（共 ${pdf.numPages} 页）`)
    }
    const metadata = await pdf.getMetadata()
    const info = metadata?.info ?? {}
    const title = metadataText(info.Title) || basename(filePath, extname(filePath))
    const author = metadataText(info.Author)
    const chapters = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const blocks = pageBlocks(groupLines(collectItems(content)))
      if (blocks.length === 0) continue
      chapters.push({
        id: `c${String(chapters.length + 1).padStart(3, '0')}`,
        title: `第 ${pageNumber} 页`,
        page: pageNumber,
        blocks,
        chars: blocks.map(block => block.text).join('\n\n').length,
      })
    }

    return {
      title,
      author,
      chapters,
      chars: chapters.reduce((sum, chapter) => sum + chapter.chars, 0),
    }
  } finally {
    await loadingTask.destroy()
  }
}
