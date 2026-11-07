import type { BookFormat } from '../formats.ts'
import type { NoteRecord } from '../notes.ts'
import type { ChatMessage } from './types.ts'
import type { PageLayout, ReaderMode } from './paging.ts'

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function downloadText(fileName: string, text: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !document.body) return
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function formatSize(bytes: unknown): string {
  if (!Number.isFinite(bytes)) return ''
  const value = bytes as number
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function textOfContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

export function foldTranscript(entries: readonly any[] | null | undefined): ChatMessage[] {
  const messages: ChatMessage[] = []
  for (const entry of entries ?? []) {
    if (!entry || entry.type !== 'event' || !entry.event) continue
    const event = entry.event
    if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
    const data = event.data ?? {}
    const message = data.message ?? data
    const source = message.source ?? data.source
    if (event.type === 'user/message' && source && source.kind !== 'user') continue
    const text = textOfContent(message.content ?? data.content)
    if (!text) continue
    messages.push({
      key: `${event.type}-${event.seq ?? messages.length}`,
      role: event.type === 'user/message' ? 'user' : 'assistant',
      text,
    })
  }
  return messages
}

export const CHAT_WIDTH_KEY = 'dsh-readpilot.chat-width'
export const READER_PALETTE_KEY = 'dsh-readpilot.palette'
export const READING_MODE_KEY = 'dsh-readpilot.reading-mode'
export const PAGE_LAYOUT_KEY = 'dsh-readpilot.page-layout'
export const COVERS_ENABLED_KEY = 'dsh-readpilot.covers'
export const GLASS_BLUR_KEY = 'dsh-readpilot.glass-blur'
export const DEFAULT_GLASS_BLUR = 25
export const MAX_GLASS_BLUR = 80

/** Clamp a user-provided blur to 0–80 px; missing or invalid values fall back to the default. */
export function normalizeGlassBlur(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_GLASS_BLUR
  const blur = Number(value)
  if (!Number.isFinite(blur)) return DEFAULT_GLASS_BLUR
  return Math.round(Math.min(MAX_GLASS_BLUR, Math.max(0, blur)))
}
export const DEFAULT_READING_MODE: ReaderMode = 'paged'
export const DEFAULT_PAGE_LAYOUT: PageLayout = 'single'

export interface ReaderPalette {
  id: string
  bg: string
  fg: string
  muted: string
  border: string
  selection: string
  highlight: string
}

export const READER_PALETTE_IDS: readonly string[] = ['auto', 'light', 'dark', 'sepia', 'green', 'night', 'glass']

export const READER_PALETTES: Record<string, ReaderPalette> = {
  auto: {
    id: 'auto',
    bg: 'var(--dsw-alias-bg-base)',
    fg: 'var(--dsw-alias-label-primary)',
    muted: 'var(--dsw-alias-label-secondary)',
    border: 'var(--dsw-alias-border-l2)',
    selection: 'rgba(64,128,255,.30)',
    highlight: 'rgba(245,197,66,.35)',
  },
  light: {
    id: 'light',
    bg: '#ffffff',
    fg: '#1f2328',
    muted: '#5b6573',
    border: '#d8dee6',
    selection: 'rgba(64,128,255,.22)',
    highlight: 'rgba(245,197,66,.45)',
  },
  dark: {
    id: 'dark',
    bg: '#1b1b22',
    fg: '#e6e6ea',
    muted: '#a0a0aa',
    border: '#33333d',
    selection: 'rgba(96,160,255,.35)',
    highlight: 'rgba(245,197,66,.35)',
  },
  sepia: {
    id: 'sepia',
    bg: '#f4ecd8',
    fg: '#4b3a2a',
    muted: '#7a6652',
    border: '#d8c9ad',
    selection: 'rgba(180,120,40,.25)',
    highlight: 'rgba(220,170,70,.45)',
  },
  green: {
    id: 'green',
    bg: '#dbe9d5',
    fg: '#1f3a2a',
    muted: '#4f6b58',
    border: '#b9cfae',
    selection: 'rgba(40,120,70,.22)',
    highlight: 'rgba(220,180,60,.45)',
  },
  night: {
    id: 'night',
    bg: '#0b0b0d',
    fg: '#c9c9cf',
    muted: '#7d7d87',
    border: '#24242b',
    selection: 'rgba(90,140,220,.35)',
    highlight: 'rgba(200,160,60,.35)',
  },
  glass: {
    id: 'glass',
    bg: 'var(--dsh-readpilot-surface)',
    fg: 'var(--dsw-alias-label-primary)',
    muted: 'var(--dsw-alias-label-secondary)',
    border: 'var(--dsw-alias-border-l2)',
    selection: 'rgba(64,128,255,.22)',
    highlight: 'rgba(245,197,66,.42)',
  },
}

export function resolveReaderPalette(id: string): ReaderPalette {
  return READER_PALETTES[id] ?? READER_PALETTES.auto
}

export function readPaletteId(): string {
  try {
    const value = window.localStorage.getItem(READER_PALETTE_KEY)
    return typeof value === 'string' && READER_PALETTES[value] ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function savePaletteId(id: string): void {
  try {
    window.localStorage.setItem(READER_PALETTE_KEY, id)
  } catch {
    // Palette persistence is best effort.
  }
}

export function readReadingMode(): ReaderMode {
  try {
    const value = window.localStorage.getItem(READING_MODE_KEY)
    return value === 'scroll' || value === 'paged' ? value : DEFAULT_READING_MODE
  } catch {
    return DEFAULT_READING_MODE
  }
}

export function saveReadingMode(mode: ReaderMode): void {
  try {
    window.localStorage.setItem(READING_MODE_KEY, mode)
  } catch {
    // Reading-mode persistence is best effort.
  }
}

export const REFLOW_BOOKS_KEY = 'dsh-readpilot.reflow-books'

export function readReflowBooks(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REFLOW_BOOKS_KEY) ?? '{}') as Record<string, unknown>
    const books: Record<string, boolean> = {}
    for (const [bookId, enabled] of Object.entries(parsed ?? {})) {
      if (/^[A-Za-z0-9_-]{1,64}$/.test(bookId) && typeof enabled === 'boolean') books[bookId] = enabled
    }
    return books
  } catch {
    return {}
  }
}

export function saveReflowBooks(books: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(REFLOW_BOOKS_KEY, JSON.stringify(books))
  } catch {
    // Per-book reflow persistence is best effort.
  }
}

export function reflowEnabledFor(books: Record<string, boolean>, bookId: string, format: BookFormat): boolean {
  return books[bookId] ?? (format === 'txt' || format === 'md')
}

export const FONT_SIZE_KEY = 'dsh-readpilot.font-size'
export const DEFAULT_FONT_SIZE = 17
export const MIN_FONT_SIZE = 14
export const MAX_FONT_SIZE = 24

export function normalizeFontSize(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_FONT_SIZE
  const size = Number(value)
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.round(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)))
}

export function readFontSize(): number {
  try {
    return normalizeFontSize(window.localStorage.getItem(FONT_SIZE_KEY))
  } catch {
    return DEFAULT_FONT_SIZE
  }
}

export function saveFontSize(value: number): void {
  try {
    window.localStorage.setItem(FONT_SIZE_KEY, String(normalizeFontSize(value)))
  } catch {
    // Font-size persistence is best effort.
  }
}

export function readCoversEnabled(): boolean {
  try {
    return window.localStorage.getItem(COVERS_ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveCoversEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(COVERS_ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    // Cover preference persistence is best effort.
  }
}

export function readGlassBlur(): number {
  try {
    return normalizeGlassBlur(window.localStorage.getItem(GLASS_BLUR_KEY))
  } catch {
    return DEFAULT_GLASS_BLUR
  }
}

export function saveGlassBlur(blur: number): void {
  try {
    window.localStorage.setItem(GLASS_BLUR_KEY, String(normalizeGlassBlur(blur)))
  } catch {
    // Blur preference persistence is best effort.
  }
}

export function readPageLayout(): PageLayout {
  try {
    const value = window.localStorage.getItem(PAGE_LAYOUT_KEY)
    return value === 'single' || value === 'double' ? value : DEFAULT_PAGE_LAYOUT
  } catch {
    return DEFAULT_PAGE_LAYOUT
  }
}

export function savePageLayout(layout: PageLayout): void {
  try {
    window.localStorage.setItem(PAGE_LAYOUT_KEY, layout)
  } catch {
    // Page-layout persistence is best effort.
  }
}

export function paletteCssColors(palette: ReaderPalette): { bg: string; fg: string; selection: string; highlight: string } {
  let css: CSSStyleDeclaration | null = null
  try {
    css = getComputedStyle(document.documentElement)
  } catch {
    css = null
  }
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
  const label = css?.getPropertyValue('--dsw-alias-label-primary').trim() ?? ''
  if (palette.id === 'glass') {
    const base = css?.getPropertyValue('--dsw-alias-bg-base').trim() ?? ''
    return {
      bg: base || (dark ? '#1b1b22' : '#ffffff'),
      fg: label || (dark ? '#e6e6ea' : '#1f2328'),
      selection: palette.selection,
      highlight: palette.highlight,
    }
  }
  if (palette.id !== 'auto') {
    return { bg: palette.bg, fg: palette.fg, selection: palette.selection, highlight: palette.highlight }
  }
  const bg = css?.getPropertyValue('--dsw-alias-bg-base').trim() ?? ''
  return {
    bg: bg || (dark ? '#1b1b22' : '#ffffff'),
    fg: label || (dark ? '#e6e6ea' : '#1f2328'),
    selection: palette.selection,
    highlight: palette.highlight,
  }
}

export function applyPaletteToFrame(frame: HTMLIFrameElement | null | undefined, palette: ReaderPalette): void {
  const doc = frame?.contentDocument
  if (!doc) return
  const colors = paletteCssColors(palette)
  let style = doc.querySelector('style[data-dsh-palette]')
  if (!style) {
    style = doc.createElement('style')
    style.setAttribute('data-dsh-palette', '')
    ;(doc.head ?? doc.documentElement)?.appendChild(style)
  }
  style.textContent = [
    `html,body{background:${colors.bg}!important;color:${colors.fg}!important}`,
    `body :is(p,div,span,li,blockquote,td,th,h1,h2,h3,h4,h5,h6){color:inherit!important}`,
    `::selection{background:${colors.selection}}`,
  ].join('')
}

export function findNoteOccurrence(
  text: string,
  quote: string,
  preferredOffset = 0,
  prefix = '',
  suffix = '',
): { start: number; end: number } | null {
  if (typeof text !== 'string' || typeof quote !== 'string' || !quote) return null
  const preferred = Number.isFinite(Number(preferredOffset)) ? Number(preferredOffset) : 0
  const wantedPrefix = typeof prefix === 'string' ? prefix : ''
  const wantedSuffix = typeof suffix === 'string' ? suffix : ''
  let best: { start: number; end: number; score: number } | null = null
  let index = text.indexOf(quote)
  while (index !== -1) {
    const before = wantedPrefix ? text.slice(Math.max(0, index - wantedPrefix.length), index) : ''
    const after = wantedSuffix ? text.slice(index + quote.length, index + quote.length + wantedSuffix.length) : ''
    const mismatch = (wantedPrefix && before !== wantedPrefix ? 100000 : 0)
      + (wantedSuffix && after !== wantedSuffix ? 100000 : 0)
    const score = Math.abs(index - preferred) + mismatch
    if (!best || score < best.score) {
      best = { start: index, end: index + quote.length, score }
    }
    index = text.indexOf(quote, index + 1)
  }
  return best ? { start: best.start, end: best.end } : null
}

export function collectTextNodes(root: Element | null | undefined): { nodes: Text[]; text: string } {
  if (!root) return { nodes: [], text: '' }
  const doc = root.ownerDocument ?? document
  const view = doc.defaultView ?? window
  const walker = doc.createTreeWalker(root, view.NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (!parent?.closest('.dsh-readpilot-note-layer')) nodes.push(node as Text)
    node = walker.nextNode()
  }
  return { nodes, text: nodes.map(entry => entry.nodeValue ?? '').join('') }
}

export function rangeForNote(root: Element, start: number, end: number): Range | null {
  const { nodes } = collectTextNodes(root)
  const doc = root.ownerDocument ?? document
  const range = doc.createRange()
  let cursor = 0
  let started = false
  for (const node of nodes) {
    const length = node.nodeValue?.length ?? 0
    const nodeStart = cursor
    const nodeEnd = cursor + length
    if (!started && start >= nodeStart && start <= nodeEnd) {
      range.setStart(node, Math.max(0, Math.min(length, start - nodeStart)))
      started = true
    }
    if (started && end >= nodeStart && end <= nodeEnd) {
      range.setEnd(node, Math.max(0, Math.min(length, end - nodeStart)))
      return range
    }
    cursor = nodeEnd
  }
  return null
}

interface NoteRect {
  left: number
  top: number
  width: number
  height: number
  fontSize: number
}

export interface PdfRectSource {
  text?: string
  left?: number
  top?: number
  width?: number
  height?: number
  fontSize?: number
}

export function pdfNoteRects(
  pageView: { textItems?: readonly PdfRectSource[] | null } | null | undefined,
  match: { start: number; end: number } | null | undefined,
): Array<Omit<NoteRect, 'fontSize'>> {
  const items = Array.isArray(pageView?.textItems) ? pageView.textItems : []
  if (!match || !Number.isFinite(match.start) || !Number.isFinite(match.end)) return []
  const rects: NoteRect[] = []
  let cursor = 0
  for (const item of items) {
    const text = typeof item?.text === 'string' ? item.text : ''
    const length = text.length
    const start = cursor
    const end = cursor + length
    cursor = end
    if (length === 0 || end <= match.start || start >= match.end) continue
    const from = Math.max(match.start, start)
    const to = Math.min(match.end, end)
    if (to <= from) continue
    const left = Number(item.left) || 0
    const top = Number(item.top) || 0
    const width = Math.max(1, Number(item.width) || 0)
    const height = Math.max(1, Number(item.height) || 0)
    rects.push({
      left: left + (width * (from - start)) / length,
      top,
      width: Math.max(1, (width * (to - from)) / length),
      height,
      fontSize: Math.max(1, Number(item.fontSize) || height),
    })
  }

  rects.sort((first, second) => first.top - second.top || first.left - second.left)
  const merged: NoteRect[] = []
  for (const rect of rects) {
    const previous = merged.at(-1)
    const tolerance = Math.max(2, (previous?.fontSize ?? rect.fontSize) * 0.5)
    const sameLine = previous && Math.abs(previous.top - rect.top) <= Math.max(2, rect.fontSize * 0.35)
    const gap = previous ? rect.left - (previous.left + previous.width) : Number.POSITIVE_INFINITY
    if (previous && sameLine && gap <= tolerance) {
      const right = Math.max(previous.left + previous.width, rect.left + rect.width)
      const bottom = Math.max(previous.top + previous.height, rect.top + rect.height)
      previous.top = Math.min(previous.top, rect.top)
      previous.height = bottom - previous.top
      previous.width = right - previous.left
    } else {
      merged.push({ ...rect })
    }
  }
  return merged.map(({ fontSize, ...rect }) => rect)
}

export function applyEpubNoteMarks(
  frame: HTMLIFrameElement | null | undefined,
  notes: readonly NoteRecord[],
  chapterId: string,
  palette: ReaderPalette,
  onOpen: (note: NoteRecord) => void,
  jumpNoteId?: string | null,
): { cleanup: () => void; jumped: boolean } {
  const doc = frame?.contentDocument
  if (!doc?.body) return { cleanup: () => {}, jumped: false }
  for (const mark of [...doc.querySelectorAll('mark[data-note-id]')]) {
    const parent = mark.parentNode
    if (!parent) continue
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parent.normalize?.()
  }
  const relevant = notes.filter(note => note.chapterId === chapterId && note.quote)
  let style = doc.querySelector('style[data-dsh-note]')
  if (!style) {
    style = doc.createElement('style')
    style.setAttribute('data-dsh-note', '')
    ;(doc.head ?? doc.documentElement)?.appendChild(style)
  }
  const highlightColors: Record<string, string> = {
    yellow: 'rgba(250,204,21,.38)',
    green: 'rgba(74,222,128,.32)',
    blue: 'rgba(96,165,250,.32)',
    pink: 'rgba(244,114,182,.30)',
    purple: 'rgba(192,132,252,.30)',
  }
  style.textContent = `mark.dsh-readpilot-note-mark{background:${paletteCssColors(palette).highlight}!important;color:inherit!important;cursor:pointer;border-radius:2px}mark.dsh-readpilot-highlight-yellow{background:${highlightColors.yellow}!important}mark.dsh-readpilot-highlight-green{background:${highlightColors.green}!important}mark.dsh-readpilot-highlight-blue{background:${highlightColors.blue}!important}mark.dsh-readpilot-highlight-pink{background:${highlightColors.pink}!important}mark.dsh-readpilot-highlight-purple{background:${highlightColors.purple}!important}mark.dsh-readpilot-note-mark.dsh-readpilot-note-flash{box-shadow:0 0 0 2px ${paletteCssColors(palette).selection}}`
  const onClick = (event: Event) => {
    const target = event.target as Element | null
    const mark = target?.closest?.('mark[data-note-id]') as HTMLElement | null
    if (!mark) return
    const note = notes.find(entry => entry.id === mark.dataset.noteId)
    if (note) onOpen(note)
  }
  doc.addEventListener('click', onClick)
  const text = doc.body.textContent ?? ''
  for (const note of relevant) {
    const match = findNoteOccurrence(text, note.quote, note.offset, note.quotePrefix, note.quoteSuffix)
    if (!match) continue
    const range = rangeForNote(doc.body, match.start, match.end)
    if (!range) continue
    const mark = doc.createElement('mark')
    mark.className = note.kind === 'highlight'
      ? `dsh-readpilot-note-mark dsh-readpilot-highlight-${note.color ?? 'yellow'}`
      : 'dsh-readpilot-note-mark'
    mark.dataset.noteId = note.id
    mark.appendChild(range.extractContents())
    range.insertNode(mark)
  }
  let jumped = false
  if (jumpNoteId) {
    const target = doc.querySelector(`mark[data-note-id="${jumpNoteId}"]`)
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' })
      target.classList.add('dsh-readpilot-note-flash')
      setTimeout(() => target.classList.remove('dsh-readpilot-note-flash'), 1600)
      jumped = true
    }
  }
  return {
    cleanup: () => doc.removeEventListener('click', onClick),
    jumped,
  }
}

export const CHAT_WIDTH_DEFAULT = 420
export const CHAT_WIDTH_MIN = 360
export const CHAT_WIDTH_MAX = 640

export function clampChatWidth(value: number, viewportWidth: number): number {
  const numeric = Number.isFinite(value) ? value : CHAT_WIDTH_DEFAULT
  const available = Number.isFinite(viewportWidth)
    ? viewportWidth - 230 - 360
    : CHAT_WIDTH_MAX
  const upper = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, available))
  return Math.round(Math.min(Math.max(numeric, CHAT_WIDTH_MIN), upper))
}

export function readChatWidth(): number {
  let stored = CHAT_WIDTH_DEFAULT
  try {
    const raw = window.localStorage.getItem(CHAT_WIDTH_KEY)
    if (raw !== null && Number.isFinite(Number(raw))) stored = Number(raw)
  } catch {
    // A browser with storage disabled keeps the default width.
  }
  return clampChatWidth(stored, window.innerWidth > 1100 ? window.innerWidth : 1440)
}

export function saveChatWidth(width: number): void {
  try {
    window.localStorage.setItem(CHAT_WIDTH_KEY, String(width))
  } catch {
    // Width persistence is best effort.
  }
}

export interface MarkdownBlock {
  type: 'p' | 'h' | 'code' | 'hr' | 'quote' | 'li' | 'table' | 'image'
  text?: string
  level?: number
  ordered?: boolean
  index?: number
  lang?: string
  rows?: string[][]
  src?: string
  alt?: string
}

export function parseMarkdownBlocks(text: unknown): MarkdownBlock[] {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let inFence = false
  let fenceLang = ''
  let fenceLines: string[] = []

  const flushParagraph = () => {
    const value = paragraph.join('\n').trim()
    if (value) blocks.push({ type: 'p', text: value })
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (inFence) {
      if (/^\s*(```|~~~)\s*$/.test(line)) {
        blocks.push({ type: 'code', text: fenceLines.join('\n'), lang: fenceLang })
        inFence = false
        fenceLang = ''
        fenceLines = []
      } else {
        fenceLines.push(line)
      }
      continue
    }
    const fence = /^\s*(```|~~~)([A-Za-z0-9_+-]*)\s*$/.exec(line)
    if (fence) {
      flushParagraph()
      inFence = true
      fenceLang = fence[2] || ''
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      continue
    }
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2] })
      continue
    }
    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      flushParagraph()
      blocks.push({ type: 'hr' })
      continue
    }
    if (/^>\s?/.test(line)) {
      flushParagraph()
      const quoteLines: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      index -= 1
      blocks.push({ type: 'quote', text: quoteLines.join('\n') })
      continue
    }
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flushParagraph()
      blocks.push({ type: 'li', ordered: true, index: Number(ordered[1]), text: ordered[2] })
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      blocks.push({ type: 'li', text: bullet[1] })
      continue
    }
    paragraph.push(line)
  }
  if (inFence) {
    blocks.push({ type: 'code', text: fenceLines.join('\n'), lang: fenceLang })
  }
  flushParagraph()
  return blocks
}

export function timestampOf(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function blockIndexAtOffset(blocks: ReadonlyArray<{ text?: string }> | null | undefined, offset: number): number {
  if (!Array.isArray(blocks) || blocks.length === 0) return 0
  const wanted = Number.isFinite(offset) ? offset : 0
  let start = 0
  let fallback = 0
  for (let index = 0; index < blocks.length; index += 1) {
    const text = typeof blocks[index]?.text === 'string' ? blocks[index].text : ''
    if (wanted < start) break
    fallback = index
    if (wanted <= start + text.length) return index
    start += text.length + 2
  }
  return fallback
}

export interface DiffLine {
  type: 'same' | 'add' | 'del'
  text: string
}

export function diffLines(base: string, next: string): DiffLine[] {
  const before = String(base ?? '').replace(/\r\n?/g, '\n').split('\n')
  const after = String(next ?? '').replace(/\r\n?/g, '\n').split('\n')
  let prefix = 0
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < before.length - prefix
    && suffix < after.length - prefix
    && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) suffix += 1
  const lines: DiffLine[] = []
  for (let index = 0; index < prefix; index += 1) lines.push({ type: 'same', text: before[index] })
  for (let index = prefix; index < before.length - suffix; index += 1) lines.push({ type: 'del', text: before[index] })
  for (let index = prefix; index < after.length - suffix; index += 1) lines.push({ type: 'add', text: after[index] })
  for (let index = before.length - suffix; index < before.length; index += 1) lines.push({ type: 'same', text: before[index] })
  return lines
}
