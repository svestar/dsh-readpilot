import type { NoteRecord } from '../../notes/store.ts'
import { isAnnotationKind } from './mark-filters.ts'
import { paletteCssColors } from '../settings/reader-preferences.ts'
import type { ReaderPalette } from '../settings/reader-preferences.ts'

export interface CompactAnchor {
  value: string
  map: number[]
}

export function compactAnchorText(text: string): CompactAnchor {
  const characters: string[] = []
  const map: number[] = []
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (/\s/u.test(character) || character === '\u00AD' || character === '\u200B' || character === '\uFEFF') continue
    characters.push(character)
    map.push(index)
  }
  map.push(text.length)
  return { value: characters.join(''), map }
}

export function findNoteOccurrence(
  text: string,
  quote: string,
  preferredOffset = 0,
  prefix = '',
  suffix = '',
  compact?: () => CompactAnchor,
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
  if (best) return { start: best.start, end: best.end }
  const haystack = compact ? compact() : compactAnchorText(text)
  const needle = compactAnchorText(quote)
  if (!needle.value) return null
  const compactPrefix = compactAnchorText(wantedPrefix).value
  const compactSuffix = compactAnchorText(wantedSuffix).value
  let compactIndex = haystack.value.indexOf(needle.value)
  while (compactIndex !== -1) {
    const start = haystack.map[compactIndex]
    const last = compactIndex + needle.value.length - 1
    const end = haystack.map[last] + 1
    const before = compactPrefix ? haystack.value.slice(Math.max(0, compactIndex - compactPrefix.length), compactIndex) : ''
    const after = compactSuffix ? haystack.value.slice(last + 1, last + 1 + compactSuffix.length) : ''
    const mismatch = (compactPrefix && before !== compactPrefix ? 100000 : 0)
      + (compactSuffix && after !== compactSuffix ? 100000 : 0)
    const score = Math.abs(start - preferred) + mismatch
    if (!best || score < best.score) best = { start, end, score }
    compactIndex = haystack.value.indexOf(needle.value, compactIndex + 1)
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

export function rangeForNodes(nodes: readonly Text[], doc: Document, start: number, end: number): Range | null {
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

export function rangeForNote(root: Element, start: number, end: number): Range | null {
  const { nodes } = collectTextNodes(root)
  return rangeForNodes(nodes, root.ownerDocument ?? document, start, end)
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
  let compact: CompactAnchor | null = null
  const compactText = () => (compact ??= compactAnchorText(text))
  for (const note of relevant) {
    const match = findNoteOccurrence(text, note.quote, typeof note.start === 'number' ? note.start : note.offset, note.quotePrefix, note.quoteSuffix, compactText)
    if (!match) continue
    // Each inserted mark can split text nodes, so recollect before the next range.
    const range = rangeForNote(doc.body, match.start, match.end)
    if (!range) continue
    const mark = doc.createElement('mark')
    mark.className = isAnnotationKind(note.kind)
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
