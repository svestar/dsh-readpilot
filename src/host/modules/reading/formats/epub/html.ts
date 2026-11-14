import { posix } from 'node:path'
import type JSZip from 'jszip'
import { parseHTML } from 'linkedom'
import type { TextBlock } from '../../../../../shared/contracts/reading.ts'
import type { ChapterContent, ManifestItem } from './types.ts'
import { BLOCK_TYPE } from './types.ts'
import { readRequiredText } from './zip.ts'
import { elementChildren } from './xml.ts'

export async function readChapter(zip: JSZip, item: ManifestItem, tocTitles: Map<string, string>, ordinal: number): Promise<ChapterContent | null> {
  const html = await readRequiredText(zip, item.path, `EPUB 缺少章节文件：${item.path}`)
  if (!html.trim()) return null
  const { document } = parseHTML(html)
  for (const node of document.querySelectorAll('script, style, noscript, template')) {
    node.remove()
  }
  const blocks: TextBlock[] = []
  if (document.body) collectBlocks(document.body, blocks, item.path)
  if (blocks.length === 0) return null
  const heading = blocks.find(block => block.type === 'h')
  return {
    title: tocTitles.get(item.path) ?? heading?.text ?? `第 ${ordinal} 章`,
    blocks,
    chars: chapterChars(blocks),
  }
}

function collectBlocks(parent: any, blocks: TextBlock[], basePath: string): void {
  for (const element of elementChildren(parent)) {
    const tag = (element.tagName ?? '').toLowerCase()
    if (tag === 'img') {
      const image = imageBlock(element, basePath)
      if (image) blocks.push(image)
      continue
    }
    if (tag === 'table') {
      const rows = tableRows(element)
      if (rows.length) blocks.push({ type: 'table', text: rows.map(row => row.join(' ')).join('\n'), rows })
      continue
    }
    const type = BLOCK_TYPE.get(tag)
    if (type) {
      const text = type === 'code' ? preText(element) : inlineText(element)
      if (text) {
        const block: TextBlock = { type, text }
        if (type === 'h') block.level = Number(tag.slice(1))
        blocks.push(block)
      }
      for (const image of element.querySelectorAll?.('img') ?? []) {
        const block = imageBlock(image, basePath)
        if (block) blocks.push(block)
      }
      continue
    }
    collectBlocks(element, blocks, basePath)
  }
}

function tableRows(table: any): string[][] {
  const rows: string[][] = []
  const walk = (parent: any): void => {
    for (const child of elementChildren(parent)) {
      const tag = (child.tagName ?? '').toLowerCase()
      if (tag === 'tr') {
        const cells: string[] = []
        for (const cell of elementChildren(child)) {
          const cellTag = (cell.tagName ?? '').toLowerCase()
          if (cellTag === 'td' || cellTag === 'th') cells.push(inlineText(cell))
        }
        if (cells.some(cell => cell.trim())) rows.push(cells)
        continue
      }
      if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') walk(child)
    }
  }
  walk(table)
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  if (width === 0) return []
  return rows.map(row => [...row, ...Array.from({ length: width - row.length }, () => '')])
}

function resolveImagePath(basePath: string, value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw || /^(data:|https?:|\/\/)/i.test(raw)) return ''
  const clean = raw.split('#')[0].split('?')[0]
  if (!clean) return ''
  let decoded = clean
  try {
    decoded = decodeURIComponent(clean)
  } catch {
    // Keep the raw path when it contains malformed escapes.
  }
  const joined = posix.normalize(posix.join(posix.dirname(basePath), decoded)).replace(/^\/+/, '')
  if (!joined || joined === '..' || joined.startsWith('../')) return ''
  return joined
}

function imageBlock(element: any, basePath: string): TextBlock | null {
  const src = resolveImagePath(basePath, element.getAttribute?.('src'))
  if (!src) return null
  const alt = String(element.getAttribute?.('alt') ?? '').trim()
  return { type: 'image', text: alt, src, alt }
}

function inlineText(element: any): string {
  const parts: string[] = []
  appendInline(element, parts)
  return normalizeInline(parts.join(''))
}

function appendInline(node: any, parts: string[]): void {
  for (const child of node.childNodes ?? []) {
    if (child.nodeType === 3) {
      parts.push(child.nodeValue ?? '')
      continue
    }
    if (child.nodeType !== 1) continue
    const tag = (child.tagName ?? '').toLowerCase()
    if (tag === 'br') {
      parts.push('\n')
      continue
    }
    if (BLOCK_TYPE.has(tag)) parts.push('\n\n')
    appendInline(child, parts)
    if (BLOCK_TYPE.has(tag)) parts.push('\n\n')
  }
}

function normalizeInline(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function preText(element: any): string {
  return (element.textContent ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '')
}

function chapterChars(blocks: TextBlock[]): number {
  return blocks.map(block => block.text).join('\n\n').length
}
