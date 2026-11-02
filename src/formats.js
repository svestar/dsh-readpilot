import { basename, extname } from 'node:path'

const FORMAT_BY_EXTENSION = new Map([
  ['.txt', 'txt'],
  ['.text', 'txt'],
  ['.md', 'md'],
  ['.markdown', 'md'],
  ['.epub', 'epub'],
  ['.pdf', 'pdf'],
])

const MARKDOWN_HEADING = /^(#{1,2})[ \t]+(.+?)[ \t]*#*[ \t]*$/
const FENCE = /^\s*```/
const CHAPTER_LINE = /^(第\s*[0-9零一二三四五六七八九十百千两]+\s*[章节回卷篇]|Chapter\s+[0-9]+|CHAPTER\s+[0-9]+)(?:\s|[:：.、-]|$)/

export function formatOf(filePath) {
  return FORMAT_BY_EXTENSION.get(extname(filePath).toLowerCase()) ?? null
}

export function isSupportedFormat(format) {
  return format === 'txt' || format === 'md' || format === 'epub' || format === 'pdf'
}

export function decodeText(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buffer.subarray(3))
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer.subarray(2))
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer.subarray(2))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    // Fall through to the CJK legacy encodings used by older Chinese ebooks.
  }
  for (const encoding of ['gb18030', 'big5']) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer)
    } catch {
      // Try the next candidate.
    }
  }
  return new TextDecoder('utf-8').decode(buffer)
}

export function normalizeText(text) {
  return text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').replace(/\n{3,}/g, '\n\n').trim()
}

function splitMarkdownChapters(text) {
  const lines = text.split('\n')
  const marks = []
  let inFence = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = MARKDOWN_HEADING.exec(line)
    if (match) marks.push({ line: index, title: match[2].trim() })
  }
  if (marks.length === 0) return []
  const chapters = []
  const prelude = lines.slice(0, marks[0].line).join('\n').trim()
  if (prelude) chapters.push({ title: '前言', body: prelude })
  marks.forEach((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].line : lines.length
    const body = lines.slice(mark.line + 1, end).join('\n').trim()
    chapters.push({ title: mark.title || `第 ${index + 1} 章`, body })
  })
  return chapters
}

function splitTextChapters(text) {
  const lines = text.split('\n')
  const marks = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (line.length === 0 || line.length > 80) continue
    if (CHAPTER_LINE.test(line)) marks.push({ line: index, title: line })
  }
  if (marks.length === 0) return []
  const chapters = []
  const prelude = lines.slice(0, marks[0].line).join('\n').trim()
  if (prelude) chapters.push({ title: '前言', body: prelude })
  marks.forEach((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].line : lines.length
    const body = lines.slice(mark.line + 1, end).join('\n').trim()
    chapters.push({ title: mark.title, body })
  })
  return chapters
}

function splitByLength(text, target = 6000) {
  const paragraphs = text.split(/\n{2,}/)
  const chapters = []
  let current = []
  let length = 0
  for (const paragraph of paragraphs) {
    const piece = paragraph.trim()
    if (!piece) continue
    if (length > 0 && length + piece.length > target) {
      chapters.push(current.join('\n\n'))
      current = []
      length = 0
    }
    current.push(piece)
    length += piece.length + 2
  }
  if (current.length > 0) chapters.push(current.join('\n\n'))
  if (chapters.length === 0) return []
  return chapters.map((body, index) => ({ title: `第 ${index + 1} 节`, body }))
}

export function splitChapters(text, format) {
  const normalized = normalizeText(text)
  if (!normalized) return []
  const marked = format === 'md' ? splitMarkdownChapters(normalized) : splitTextChapters(normalized)
  if (marked.length >= 2) return marked
  if (marked.length === 1) return marked
  return splitByLength(normalized)
}

function takeFrontmatter(text) {
  if (!text.startsWith('---\n')) return { meta: {}, body: text }
  const end = text.indexOf('\n---', 4)
  if (end === -1) return { meta: {}, body: text }
  const block = text.slice(4, end)
  const meta = {}
  for (const line of block.split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line.trim())
    if (match) meta[match[1].toLowerCase()] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  const after = text.slice(end + 4)
  return { meta, body: after.startsWith('\n') ? after.slice(1) : after }
}

export function parseBlocks(body, format) {
  const blocks = []
  const lines = body.split('\n')
  let paragraph = []
  let inFence = false
  let fence = []

  const flush = () => {
    const text = paragraph.join('\n').trim()
    if (text) blocks.push({ type: 'p', text })
    paragraph = []
  }

  for (const line of lines) {
    if (format === 'md' && FENCE.test(line)) {
      if (inFence) {
        blocks.push({ type: 'code', text: fence.join('\n').trimEnd() })
        fence = []
        inFence = false
      } else {
        flush()
        inFence = true
      }
      continue
    }
    if (inFence) {
      fence.push(line)
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    if (format === 'md') {
      const heading = /^(#{3,6})\s+(.+?)\s*$/.exec(line)
      if (heading) {
        flush()
        blocks.push({ type: 'h', text: heading[2].trim(), level: heading[1].length })
        continue
      }
      if (/^>\s?/.test(line)) {
        flush()
        blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '').trim() })
        continue
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        flush()
        blocks.push({ type: 'li', text: line.replace(/^\s*([-*+]|\d+[.)])\s+/, '').trim() })
        continue
      }
    }
    paragraph.push(line)
  }
  flush()
  return blocks
}

export function chapterText(chapter) {
  return chapter.blocks.map(block => block.text).join('\n\n')
}

export function parseBook(buffer, format, filePath) {
  if (format !== 'txt' && format !== 'md') {
    throw new Error(`同步解析不支持 ${format}，请使用 parseBookAsync`)
  }
  const raw = normalizeText(decodeText(buffer))
  const fallbackTitle = basename(filePath, extname(filePath))
  if (format === 'md') {
    const { meta, body } = takeFrontmatter(raw)
    const chapters = splitChapters(body, 'md')
    const title = meta.title || chapters[0]?.title || fallbackTitle
    return finalizeBook({ title, author: meta.author ?? '', chapters, format })
  }
  const chapters = splitChapters(raw, 'txt')
  return finalizeBook({ title: fallbackTitle, author: '', chapters, format })
}

export async function parseBookAsync(buffer, format, filePath) {
  if (format === 'epub') {
    const { parseEpub } = await import('./formats/epub.js')
    return parseEpub(buffer, filePath)
  }
  if (format === 'pdf') {
    const { parsePdf } = await import('./formats/pdf.js')
    return parsePdf(buffer, filePath)
  }
  return parseBook(buffer, format, filePath)
}

function finalizeBook({ title, author, chapters, format }) {
  const normalized = (chapters.length > 0 ? chapters : [{ title: '正文', body: '' }]).map((chapter, index) => {
    const blocks = parseBlocks(chapter.body, format)
    const normalizedChapter = {
      id: `c${String(index + 1).padStart(3, '0')}`,
      title: chapter.title.trim() || `第 ${index + 1} 章`,
      blocks: blocks.length > 0 ? blocks : [{ type: 'p', text: chapter.body.trim() }].filter(block => block.text),
    }
    normalizedChapter.chars = chapterText(normalizedChapter).length
    return normalizedChapter
  })
  return {
    title: title.trim() || '未命名书籍',
    author: author.trim(),
    chapters: normalized,
    chars: normalized.reduce((sum, chapter) => sum + chapter.chars, 0),
  }
}
