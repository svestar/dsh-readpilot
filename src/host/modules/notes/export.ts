import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'

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
  kind: 'annotation' | 'note' | 'highlight' | 'bookmark'
  chapterTitle?: string
  quote?: string
  note?: string
  annotation?: string
  color?: string
  pageLabel?: string
}

const MARKDOWN_SPECIAL = /[\\`*_{}\[\]<>#|]/g

function localized(language: WorkspaceLanguage, zh: string, en: string): string {
  return language === 'en' ? en : zh
}

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

function metadataBlock(
  book: ExportBook,
  exportedAt: number | undefined,
  language: WorkspaceLanguage,
): string[] {
  const lines: string[] = []
  const separator = language === 'en' ? ': ' : '：'
  const author = inline(book.author)
  if (author) lines.push(`> ${localized(language, '作者', 'Author')}${separator}${author}`)

  const tags = Array.isArray(book.tags)
    ? book.tags.map(tag => inline(tag)).filter(Boolean)
    : []
  if (tags.length > 0) lines.push(`> ${localized(language, '标签', 'Tags')}${separator}${tags.join(language === 'en' ? ', ' : '、')}`)

  const progress = book.progress
  const progressParts = [inline(progress?.chapterTitle), formatPercent(progress?.percent)].filter(Boolean)
  if (progressParts.length > 0) lines.push(`> ${localized(language, '进度', 'Progress')}${separator}${progressParts.join(' · ')}`)

  lines.push(`> ${localized(language, '导出时间', 'Exported')}${separator}${formatTime(exportedAt)}`)
  return lines
}

function renderMark(mark: ExportMark, language: WorkspaceLanguage): string {
  const quote = text(mark.quote)
  if (mark.kind === 'annotation' || mark.kind === 'highlight' || mark.kind === 'note') {
    const body = text(mark.note) || text(mark.annotation)
    return joinBlocks([quote ? quoteBlock(quote) : '', block(body)])
  }
  if (mark.kind === 'bookmark') {
    const label = inline(mark.note)
    const page = inline(mark.pageLabel)
    const detail = label && page ? `${label} · ${page}` : label || page
    return detail ? `- ${localized(language, '书签', 'Bookmark')}${language === 'en' ? ': ' : '：'}${detail}` : ''
  }
  return ''
}

function marksSection(marks: unknown, language: WorkspaceLanguage): string {
  if (!Array.isArray(marks)) return ''
  const groups = new Map<string, string[]>()
  for (const mark of marks as ExportMark[]) {
    if (!mark || typeof mark !== 'object') continue
    const rendered = renderMark(mark, language)
    if (!rendered) continue
    const chapter = text(mark.chapterTitle).replace(/\s+/g, ' ')
      || localized(language, '未标注章节', 'Uncategorized chapter')
    const group = groups.get(chapter)
    if (group) group.push(rendered)
    else groups.set(chapter, [rendered])
  }
  if (groups.size === 0) return ''
  const chapters = [...groups.entries()].map(([chapter, items]) => {
    return `### ${inline(chapter)}\n\n${items.join('\n\n')}`
  })
  return `## ${localized(language, '批注与书签', 'Annotations and bookmarks')}\n\n${chapters.join('\n\n')}`
}

export function buildNotesMarkdown(input: {
  book: ExportBook
  notes: ExportLongNote[]
  marks: ExportMark[]
  exportedAt?: number
  language?: WorkspaceLanguage
}): string {
  const language = input.language ?? 'zh'
  const book = input.book ?? { title: '' }
  const notes = Array.isArray(input.notes) ? input.notes : []
  const untitled = localized(language, '未命名', 'Untitled')
  const title = inline(book.title) || untitled
  const parts = [
    language === 'en' ? `# ${title} — Reading notes` : `# 《${title}》阅读笔记`,
    metadataBlock(book, input.exportedAt, language).join('\n'),
  ]

  const bookNote = notes.find(note => note?.kind === 'book')
  const bookBody = block(bookNote?.body)
  if (bookBody) parts.push(`## ${localized(language, '整书笔记', 'Book note')}\n\n${bookBody}`)

  const topics = notes.filter(note => note?.kind === 'topic')
  if (topics.length > 0) {
    const sections = topics.map(note => {
      const title = inline(note.title)
      const body = block(note.body)
      if (!title && !body) return ''
      const heading = `### ${title || untitled}`
      return body ? `${heading}\n\n${body}` : heading
    }).filter(Boolean)
    if (sections.length > 0) parts.push(`## ${localized(language, '主题笔记', 'Topic notes')}\n\n${sections.join('\n\n')}`)
  }

  const marks = marksSection(input.marks, language)
  if (marks) parts.push(marks)

  return `${parts.join('\n\n').trimEnd()}\n`
}
