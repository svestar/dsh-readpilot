export interface ExportBook {
  title: string
  author?: string
  tags?: string[]
  progress?: { chapterTitle?: string; percent?: number }
}

export interface ExportLongNote {
  kind: 'book' | 'topic'
  title: string
  body: string
  path?: string
  updatedAt?: number
}

export interface ExportMark {
  kind: 'highlight' | 'note' | 'bookmark'
  chapterTitle?: string
  quote?: string
  note?: string
  annotation?: string
  color?: string
  pageLabel?: string
}

const UNTITLED = '未命名'
const UNGROUPED_CHAPTER = '未标注章节'
const MARKDOWN_SPECIAL = /[\\`*_{}\[\]<>#|]/g

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : ''
}

function inline(value: unknown): string {
  return text(value).replace(/\s+/g, ' ').replace(MARKDOWN_SPECIAL, '\\$&')
}

function block(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\r\n?/g, '\n').replace(/^[ \t]*\n+/, '').trimEnd()
}

function quoteBlock(value: string): string {
  return value
    .split('\n')
    .map(line => (line.trim() ? `> ${line}` : '>'))
    .join('\n')
}

function joinBlocks(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n')
}

function formatTime(value: number | undefined): string {
  const stamp = typeof value === 'number' && Number.isFinite(value) ? value : Date.now()
  return new Date(stamp).toISOString()
}

function formatPercent(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  const rounded = Math.round(value * 10) / 10
  return `${Math.min(100, Math.max(0, rounded))}%`
}

function metadataBlock(book: ExportBook, exportedAt: number | undefined): string[] {
  const lines: string[] = []
  const author = inline(book.author)
  if (author) lines.push(`> 作者：${author}`)

  const tags = Array.isArray(book.tags)
    ? book.tags.map(tag => inline(tag)).filter(Boolean)
    : []
  if (tags.length > 0) lines.push(`> 标签：${tags.join('、')}`)

  const progress = book.progress
  const progressParts = [inline(progress?.chapterTitle), formatPercent(progress?.percent)].filter(Boolean)
  if (progressParts.length > 0) lines.push(`> 进度：${progressParts.join(' · ')}`)

  lines.push(`> 导出时间：${formatTime(exportedAt)}`)
  return lines
}

function renderMark(mark: ExportMark): string {
  const quote = text(mark.quote)
  if (mark.kind === 'highlight') {
    return joinBlocks([quote ? quoteBlock(quote) : '', block(mark.annotation)])
  }
  if (mark.kind === 'note') {
    return joinBlocks([quote ? quoteBlock(quote) : '', block(mark.note)])
  }
  if (mark.kind === 'bookmark') {
    const label = inline(mark.note)
    const page = inline(mark.pageLabel)
    const detail = label && page ? `${label} · ${page}` : label || page
    return detail ? `- 书签：${detail}` : ''
  }
  return ''
}

function marksSection(marks: unknown): string {
  if (!Array.isArray(marks)) return ''
  const groups = new Map<string, string[]>()
  for (const mark of marks as ExportMark[]) {
    if (!mark || typeof mark !== 'object') continue
    const rendered = renderMark(mark)
    if (!rendered) continue
    const chapter = text(mark.chapterTitle).replace(/\s+/g, ' ') || UNGROUPED_CHAPTER
    const group = groups.get(chapter)
    if (group) group.push(rendered)
    else groups.set(chapter, [rendered])
  }
  if (groups.size === 0) return ''
  const chapters = [...groups.entries()].map(([chapter, items]) => {
    return `### ${inline(chapter)}\n\n${items.join('\n\n')}`
  })
  return `## 划线、批注与书签\n\n${chapters.join('\n\n')}`
}

export function buildNotesMarkdown(input: {
  book: ExportBook
  notes: ExportLongNote[]
  marks: ExportMark[]
  exportedAt?: number
}): string {
  const book = input.book ?? { title: '' }
  const notes = Array.isArray(input.notes) ? input.notes : []
  const title = inline(book.title) || UNTITLED
  const parts = [
    `# 《${title}》阅读笔记`,
    metadataBlock(book, input.exportedAt).join('\n'),
  ]

  const bookNote = notes.find(note => note?.kind === 'book')
  const bookBody = block(bookNote?.body)
  if (bookBody) parts.push(`## 整书笔记\n\n${bookBody}`)

  const topics = notes.filter(note => note?.kind === 'topic')
  if (topics.length > 0) {
    const sections = topics.map(note => {
      const title = inline(note.title)
      const body = block(note.body)
      if (!title && !body) return ''
      const heading = `### ${title || UNTITLED}`
      return body ? `${heading}\n\n${body}` : heading
    }).filter(Boolean)
    if (sections.length > 0) parts.push(`## 主题笔记\n\n${sections.join('\n\n')}`)
  }

  const marks = marksSection(input.marks)
  if (marks) parts.push(marks)

  return `${parts.join('\n\n').trimEnd()}\n`
}
