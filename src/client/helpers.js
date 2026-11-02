export function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

export function formatSize(bytes) {
      if (!Number.isFinite(bytes)) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

export function textOfContent(content) {
      if (typeof content === 'string') return content.trim()
      if (!Array.isArray(content)) return ''
      return content
        .filter(block => block && block.type === 'text' && typeof block.text === 'string')
        .map(block => block.text)
        .join('\n')
        .trim()
    }

export function foldTranscript(entries) {
      const messages = []
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

export const CHAT_WIDTH_KEY = 'dsh-reader.chat-width'
export const READER_PALETTE_KEY = 'dsh-reader.palette'
export const READER_PALETTE_IDS = ['auto', 'light', 'dark', 'sepia', 'green', 'night']
export const READER_PALETTES = {
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
    }

export function resolveReaderPalette(id) {
      return READER_PALETTES[id] ?? READER_PALETTES.auto
    }

export function readPaletteId() {
      try {
        const value = window.localStorage.getItem(READER_PALETTE_KEY)
        return READER_PALETTES[value] ? value : 'auto'
      } catch {
        return 'auto'
      }
    }

export function savePaletteId(id) {
      try {
        window.localStorage.setItem(READER_PALETTE_KEY, id)
      } catch {
        // Palette persistence is best effort.
      }
    }

export function paletteCssColors(palette) {
      if (palette.id !== 'auto') {
        return { bg: palette.bg, fg: palette.fg, selection: palette.selection, highlight: palette.highlight }
      }
      let css = null
      try {
        css = getComputedStyle(document.documentElement)
      } catch {
        css = null
      }
      const bg = css?.getPropertyValue('--dsw-alias-bg-base').trim() ?? ''
      const fg = css?.getPropertyValue('--dsw-alias-label-primary').trim() ?? ''
      const dark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
      return {
        bg: bg || (dark ? '#1b1b22' : '#ffffff'),
        fg: fg || (dark ? '#e6e6ea' : '#1f2328'),
        selection: palette.selection,
        highlight: palette.highlight,
      }
    }

export function applyPaletteToFrame(frame, palette) {
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

export function findNoteOccurrence(text, quote, preferredOffset = 0, prefix = '', suffix = '') {
      if (typeof text !== 'string' || typeof quote !== 'string' || !quote) return null
      const preferred = Number.isFinite(Number(preferredOffset)) ? Number(preferredOffset) : 0
      const wantedPrefix = typeof prefix === 'string' ? prefix : ''
      const wantedSuffix = typeof suffix === 'string' ? suffix : ''
      let best = null
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

export function collectTextNodes(root) {
      if (!root) return { nodes: [], text: '' }
      const doc = root.ownerDocument ?? document
      const view = doc.defaultView ?? window
      const walker = doc.createTreeWalker(root, view.NodeFilter.SHOW_TEXT)
      const nodes = []
      let node = walker.nextNode()
      while (node) {
        const parent = node.parentElement
        if (!parent?.closest('.dsh-reader-note-layer')) nodes.push(node)
        node = walker.nextNode()
      }
      return { nodes, text: nodes.map(entry => entry.nodeValue ?? '').join('') }
    }

export function rangeForNote(root, start, end) {
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

export function pdfNoteRects(pageView, match) {
  const items = Array.isArray(pageView?.textItems) ? pageView.textItems : []
  if (!match || !Number.isFinite(match.start) || !Number.isFinite(match.end)) return []
  const rects = []
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
  const merged = []
  for (const rect of rects) {
    const previous = merged.at(-1)
    const tolerance = Math.max(2, (previous?.fontSize ?? rect.fontSize) * 0.5)
    const sameLine = previous && Math.abs(previous.top - rect.top) <= Math.max(2, rect.fontSize * 0.35)
    const gap = previous ? rect.left - (previous.left + previous.width) : Number.POSITIVE_INFINITY
    if (sameLine && gap <= tolerance) {
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

export function applyEpubNoteMarks(frame, notes, chapterId, palette, onOpen, jumpNoteId) {
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
      const highlightColors = {
        yellow: 'rgba(250,204,21,.38)',
        green: 'rgba(74,222,128,.32)',
        blue: 'rgba(96,165,250,.32)',
        pink: 'rgba(244,114,182,.30)',
        purple: 'rgba(192,132,252,.30)',
      }
      style.textContent = `mark.dsh-reader-note-mark{background:${paletteCssColors(palette).highlight}!important;color:inherit!important;cursor:pointer;border-radius:2px}mark.dsh-reader-highlight-yellow{background:${highlightColors.yellow}!important}mark.dsh-reader-highlight-green{background:${highlightColors.green}!important}mark.dsh-reader-highlight-blue{background:${highlightColors.blue}!important}mark.dsh-reader-highlight-pink{background:${highlightColors.pink}!important}mark.dsh-reader-highlight-purple{background:${highlightColors.purple}!important}mark.dsh-reader-note-mark.dsh-reader-note-flash{box-shadow:0 0 0 2px ${paletteCssColors(palette).selection}}`
      const onClick = event => {
        const mark = event.target.closest?.('mark[data-note-id]')
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
          ? `dsh-reader-note-mark dsh-reader-highlight-${note.color ?? 'yellow'}`
          : 'dsh-reader-note-mark'
        mark.dataset.noteId = note.id
        mark.appendChild(range.extractContents())
        range.insertNode(mark)
      }
      let jumped = false
      if (jumpNoteId) {
        const target = doc.querySelector(`mark[data-note-id="${jumpNoteId}"]`)
        if (target) {
          target.scrollIntoView({ block: 'center', behavior: 'auto' })
          target.classList.add('dsh-reader-note-flash')
          setTimeout(() => target.classList.remove('dsh-reader-note-flash'), 1600)
          jumped = true
        }
      }
      return {
        cleanup: () => doc.removeEventListener('click', onClick),
        jumped,
      }
    }

export const CHAT_WIDTH_DEFAULT = 340
export const CHAT_WIDTH_MIN = 280
export const CHAT_WIDTH_MAX = 560

export function clampChatWidth(value, viewportWidth) {
      const numeric = Number.isFinite(value) ? value : CHAT_WIDTH_DEFAULT
      const available = Number.isFinite(viewportWidth)
        ? viewportWidth - 230 - 360
        : CHAT_WIDTH_MAX
      const upper = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, available))
      return Math.round(Math.min(Math.max(numeric, CHAT_WIDTH_MIN), upper))
    }

export function readChatWidth() {
      let stored = CHAT_WIDTH_DEFAULT
      try {
        const raw = window.localStorage.getItem(CHAT_WIDTH_KEY)
        if (raw !== null && Number.isFinite(Number(raw))) stored = Number(raw)
      } catch {
        // A browser with storage disabled keeps the default width.
      }
      return clampChatWidth(stored, window.innerWidth > 1100 ? window.innerWidth : 1440)
    }

export function saveChatWidth(width) {
      try {
        window.localStorage.setItem(CHAT_WIDTH_KEY, String(width))
      } catch {
        // Width persistence is best effort.
      }
    }


export function parseMarkdownBlocks(text) {
      const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
      const blocks = []
      let paragraph = []
      let inFence = false
      let fenceLang = ''
      let fenceLines = []

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
          const quoteLines = []
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

export function timestampOf(value) {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string') {
        const parsed = Date.parse(value)
        if (Number.isFinite(parsed)) return parsed
      }
      return 0
    }

export function blockIndexAtOffset(blocks, offset) {
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
