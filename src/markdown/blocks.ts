export interface MarkdownBlock {
  type: 'p' | 'h' | 'code' | 'hr' | 'quote' | 'li' | 'table' | 'image' | 'footnote'
  text?: string
  level?: number
  ordered?: boolean
  index?: number
  checked?: boolean
  indent?: number
  lang?: string
  rows?: string[][]
  src?: string
  alt?: string
  footnoteId?: string
}

function tableCells(line: string): string[] {
  let value = line.trim()
  if (value.startsWith('|')) value = value.slice(1)
  if (value.endsWith('|')) value = value.slice(0, -1)
  const cells: string[] = []
  let current = ''
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '\\' && value[index + 1] === '|') {
      current += '|'
      index += 1
    } else if (character === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  cells.push(current.trim())
  return cells
}

function tableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function indentOf(line: string): number {
  const spaces = /^\s*/.exec(line)?.[0].replace(/\t/g, '  ').length ?? 0
  return Math.floor(spaces / 2)
}

/** Parse the top-level Markdown blocks used by reading, chat and long notes. */
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
    const footnote = /^\[\^([^\]]+)\]:\s*(.*)$/.exec(line)
    if (footnote) {
      flushParagraph()
      let footnoteText = footnote[2]
      while (index + 1 < lines.length && /^(?:\s{2,}|\t)\S/.test(lines[index + 1])) {
        index += 1
        footnoteText += `\n${lines[index].replace(/^\s{2,4}/, '')}`
      }
      blocks.push({ type: 'footnote', footnoteId: footnote[1].trim(), text: footnoteText })
      continue
    }
    const setext = index + 1 < lines.length ? /^(=+|-{2,})\s*$/.exec(lines[index + 1]) : null
    const blockLike = /^(?:>|[-*+]\s|\d+[.)]\s|#{1,6}\s|```|~~~|!\[|\|)/.test(line)
    if (paragraph.length === 0 && setext && line.trim() && !blockLike) {
      flushParagraph()
      blocks.push({ type: 'h', level: setext[1][0] === '=' ? 1 : 2, text: line.trim() })
      index += 1
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
      blocks.push({ type: 'hr', text: '' })
      continue
    }
    if (line.includes('|') && index + 1 < lines.length && tableSeparator(lines[index + 1])) {
      flushParagraph()
      const rows = [tableCells(line)]
      index += 2
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(tableCells(lines[index]))
        index += 1
      }
      index -= 1
      blocks.push({ type: 'table', rows, text: rows.flat().join(' ') })
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
    const task = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    if (task) {
      flushParagraph()
      blocks.push({ type: 'li', indent: indentOf(task[1]), checked: task[2].toLowerCase() === 'x', text: task[3] })
      continue
    }
    const ordered = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flushParagraph()
      blocks.push({ type: 'li', ordered: true, indent: indentOf(ordered[1]), index: Number(ordered[2]), text: ordered[3] })
      continue
    }
    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      blocks.push({ type: 'li', indent: indentOf(bullet[1]), text: bullet[2] })
      continue
    }
    const image = /^!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)\s*$/.exec(line.trim())
    if (image) {
      flushParagraph()
      const alt = image[1].trim()
      blocks.push({ type: 'image', text: alt, src: image[2], alt })
      continue
    }
    paragraph.push(line)
  }
  if (inFence) blocks.push({ type: 'code', text: fenceLines.join('\n'), lang: fenceLang })
  flushParagraph()
  return blocks
}
