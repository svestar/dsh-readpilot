import { basename, extname, posix } from 'node:path'
import JSZip from 'jszip'
import { DOMParser, parseHTML } from 'linkedom'
import type { BlockType, Chapter, ParsedBook, TextBlock } from '../formats.ts'

interface ManifestItem {
  id: string
  path: string
  mediaType: string
  properties: string[]
}

interface ChapterContent {
  title: string
  blocks: TextBlock[]
  chars: number
}

const MEGABYTE = 1024 * 1024
const MAX_ZIP_ENTRIES = 10000
const MAX_TOTAL_BYTES = 200 * MEGABYTE
const MAX_ENTRY_BYTES = 50 * MEGABYTE
const CONTAINER_PATH = 'META-INF/container.xml'
const NCX_MEDIA_TYPE = 'application/x-dtbncx+xml'

const BLOCK_TYPE = new Map<string, BlockType>([
  ['h1', 'h'],
  ['h2', 'h'],
  ['h3', 'h'],
  ['h4', 'h'],
  ['h5', 'h'],
  ['h6', 'h'],
  ['p', 'p'],
  ['blockquote', 'quote'],
  ['pre', 'code'],
  ['li', 'li'],
])

export async function parseEpub(buffer: Buffer, filePath: string): Promise<ParsedBook> {
  const zip = await openZip(buffer)
  const container = await readRequiredText(zip, CONTAINER_PATH, 'EPUB 缺少 META-INF/container.xml')
  const opfPath = findOpfPath(container)
  const opf = await readRequiredText(zip, opfPath, `EPUB 找不到 OPF 文件：${opfPath}`)
  const packageDoc = parseXml(opf)
  if (!packageDoc.documentElement || localName(packageDoc.documentElement) !== 'package') {
    throw new Error(`EPUB 的 OPF 文件格式无效：${opfPath}`)
  }
  const metadata = readMetadata(packageDoc.documentElement)
  const manifest = readManifest(packageDoc.documentElement, opfPath)
  const spine = readSpine(packageDoc.documentElement, manifest)
  const tocTitles = await readTocTitles(zip, manifest, spine.tocId)
  const fallbackTitle = basename(filePath, extname(filePath)) || '未命名书籍'
  const opfDir = posix.dirname(opfPath)

  const chapters: Chapter[] = []
  for (const item of spine.items) {
    const chapter = await readChapter(zip, item, tocTitles, chapters.length + 1)
    if (!chapter) continue
    chapters.push({
      id: `c${String(chapters.length + 1).padStart(3, '0')}`,
      href: posix.relative(opfDir, item.path),
      ...chapter,
    })
  }

  // A spine item that only contains a short title/cover page is not a logical
  // chapter. Keep its slot for stable ids and old progress anchors, but merge
  // its body into the next content chapter and hide it from the TOC.
  for (let index = 0; index + 1 < chapters.length; index += 1) {
    const chapter = chapters[index]
    const next = chapters[index + 1]
    if (!isTitleOnly(chapter) || next.skip) continue
    const tocTitle = tocTitles.get(chapter.href ? posix.join(opfDir, chapter.href) : '')
    chapter.skip = true
    chapter.chars = 0
    // Keep the title page blocks available for old note anchors, but the
    // reading chapter is the following content page.
    next.blocks = [...chapter.blocks, ...next.blocks]
    next.chars = chapterChars(next.blocks)
    if (tocTitle && !/^(封面|cover|title\s*page|titlepage|目录|contents)$/i.test(tocTitle.trim())) {
      next.title = tocTitle
    }
  }

  return {
    title: metadata.title || fallbackTitle,
    author: metadata.author,
    chapters,
    chars: chapters.reduce((sum, chapter) => sum + chapter.chars, 0),
  }
}

function isTitleOnly(chapter: Chapter): boolean {
  if (!chapter || chapter.chars > 60) return false
  return !chapter.blocks.some(block => block.type === 'p' && block.text.length > 40)
}

async function openZip(buffer: Buffer): Promise<JSZip> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/encrypted/i.test(message)) {
      throw new Error('EPUB 是加密压缩包，无法解析', { cause: error })
    }
    throw error
  }
  assertZipLimits(zip)
  return zip
}

function assertZipLimits(zip: JSZip): void {
  const entries = Object.values(zip.files)
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`EPUB 压缩包条目数超过 ${MAX_ZIP_ENTRIES} 个`)
  }
  let total = 0
  for (const entry of entries) {
    // JSZip 未公开条目大小，加载后的 _data 保存中央目录中的解压尺寸。
    const size = (entry as any)._data?.uncompressedSize ?? 0
    if (size > MAX_ENTRY_BYTES) {
      throw new Error(`EPUB 单个条目解压后超过 ${MAX_ENTRY_BYTES / MEGABYTE} MB：${entry.name}`)
    }
    total += size
    if (total > MAX_TOTAL_BYTES) {
      throw new Error(`EPUB 解压后总大小超过 ${MAX_TOTAL_BYTES / MEGABYTE} MB`)
    }
  }
}

async function readRequiredText(zip: JSZip, path: string, message: string): Promise<string> {
  const entry = zip.file(path)
  if (!entry) throw new Error(message)
  return entry.async('string')
}

async function readOptionalText(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.file(path)
  return entry ? entry.async('string') : null
}

function parseXml(text: string): any {
  return new DOMParser().parseFromString(text, 'text/xml')
}

function findOpfPath(containerXml: string): string {
  const doc = parseXml(containerXml)
  const rootfile = findFirst(doc.documentElement, 'rootfile')
  const fullPath = rootfile?.getAttribute('full-path')?.trim()
  if (!fullPath) throw new Error('EPUB 的 container.xml 缺少 rootfile')
  return normalizeZipPath(fullPath)
}

function readManifest(packageElement: any, opfPath: string): Map<string, ManifestItem> {
  const manifest = new Map<string, ManifestItem>()
  const manifestElement = findFirst(packageElement, 'manifest')
  if (!manifestElement) return manifest
  for (const item of elementChildren(manifestElement)) {
    if (localName(item) !== 'item') continue
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    const path = resolveHref(opfPath, href)
    if (!id || !path) continue
    manifest.set(id, {
      id,
      path,
      mediaType: (item.getAttribute('media-type') ?? '').trim().toLowerCase(),
      properties: (item.getAttribute('properties') ?? '')
        .split(/\s+/)
        .filter(Boolean),
    })
  }
  return manifest
}

function readSpine(packageElement: any, manifest: Map<string, ManifestItem>): { items: ManifestItem[]; tocId: string } {
  const spineElement = findFirst(packageElement, 'spine')
  const items: ManifestItem[] = []
  if (spineElement) {
    for (const ref of elementChildren(spineElement)) {
      if (localName(ref) !== 'itemref') continue
      const item = manifest.get(ref.getAttribute('idref'))
      if (item) items.push(item)
    }
  }
  return { items, tocId: spineElement?.getAttribute('toc') ?? '' }
}

async function readTocTitles(zip: JSZip, manifest: Map<string, ManifestItem>, spineTocId: string): Promise<Map<string, string>> {
  const navItem = [...manifest.values()].find(item =>
    item.properties.some(value => value.toLowerCase() === 'nav'))
  if (navItem) {
    const navText = await readOptionalText(zip, navItem.path)
    if (navText != null) {
      const titles = parseNavTitles(navText, navItem.path)
      if (titles.size > 0) return titles
    }
  }

  const ncxItem = findNcxItem(manifest, spineTocId)
  if (!ncxItem) return new Map()
  const ncxText = await readOptionalText(zip, ncxItem.path)
  return ncxText == null ? new Map() : parseNcxTitles(ncxText, ncxItem.path)
}

function findNcxItem(manifest: Map<string, ManifestItem>, spineTocId: string): ManifestItem | null {
  const referenced = spineTocId ? manifest.get(spineTocId) : null
  if (referenced) return referenced
  return [...manifest.values()].find(item => item.mediaType === NCX_MEDIA_TYPE)
    ?? [...manifest.values()].find(item => item.path.toLowerCase().endsWith('.ncx'))
    ?? null
}

function parseNavTitles(text: string, navPath: string): Map<string, string> {
  if (!text.trim()) return new Map()
  const { document }: any = parseHTML(text)
  const toc = [...document.querySelectorAll('nav')].find((nav) => {
    const type = nav.getAttribute('epub:type') ?? ''
    return type.split(/\s+/).some((value: string) => value.toLowerCase() === 'toc')
  })
  const titles = new Map<string, string>()
  if (!toc) return titles
  for (const anchor of toc.querySelectorAll('a[href]')) {
    const path = resolveHref(navPath, anchor.getAttribute('href'))
    const title = collapseWhitespace(anchor.textContent ?? '')
    if (path && title && !titles.has(path)) titles.set(path, title)
  }
  return titles
}

function parseNcxTitles(text: string, ncxPath: string): Map<string, string> {
  const doc = parseXml(text)
  const titles = new Map<string, string>()
  walkElements(doc.documentElement, (element) => {
    if (localName(element) !== 'navpoint') return
    const label = findDirectChild(element, 'navlabel')
    const labelText = label ? findFirst(label, 'text') : null
    const content = findDirectChild(element, 'content')
    const path = resolveHref(ncxPath, content?.getAttribute('src'))
    const title = collapseWhitespace(labelText?.textContent ?? '')
    if (path && title && !titles.has(path)) titles.set(path, title)
  })
  return titles
}

async function readChapter(zip: JSZip, item: ManifestItem, tocTitles: Map<string, string>, ordinal: number): Promise<ChapterContent | null> {
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

function readMetadata(packageElement: any): { title: string; author: string } {
  const metadata = findFirst(packageElement, 'metadata')
  return {
    title: metadataValue(metadata, 'title'),
    author: metadataValue(metadata, 'creator'),
  }
}

function metadataValue(metadata: any, name: string): string {
  if (!metadata) return ''
  for (const element of elementChildren(metadata)) {
    if (localName(element) !== name) continue
    const value = collapseWhitespace(element.textContent ?? '')
    if (value) return value
  }
  return ''
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function resolveHref(basePath: string, href: unknown): string | null {
  if (typeof href !== 'string') return null
  const clean = href.trim().replace(/\\/g, '/').split(/[#?]/)[0]
  if (!clean) return null
  const decoded = decodePath(clean)
  const resolved = decoded.startsWith('/')
    ? decoded.replace(/^\/+/, '')
    : posix.join(posix.dirname(basePath), decoded)
  const normalized = posix.normalize(resolved)
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    return null
  }
  return normalized.replace(/^\.\//, '')
}

function normalizeZipPath(path: unknown): string {
  const decoded = decodePath(String(path).trim().replace(/\\/g, '/'))
  return posix.normalize(decoded.replace(/^\/+/, ''))
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    // Malformed escapes stay literal so the entry lookup fails explicitly.
    return path
  }
}

function localName(element: any): string {
  const name = element.localName || element.tagName || ''
  return name.slice(name.indexOf(':') + 1).toLowerCase()
}

function elementChildren(element: any): any[] {
  return element?.children ? [...element.children] : []
}

function walkElements(root: any, visit: (element: any) => void): void {
  for (const element of elementChildren(root)) {
    visit(element)
    walkElements(element, visit)
  }
}

function findFirst(root: any, name: string): any {
  if (!root) return null
  if (localName(root) === name) return root
  for (const element of elementChildren(root)) {
    const found = findFirst(element, name)
    if (found) return found
  }
  return null
}

function findDirectChild(element: any, name: string): any {
  return elementChildren(element).find(child => localName(child) === name) ?? null
}
