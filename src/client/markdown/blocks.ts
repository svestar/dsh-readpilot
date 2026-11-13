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
