import { basename, extname, posix } from 'node:path'
import JSZip from 'jszip'
import { DOMParser, parseHTML } from 'linkedom'

const MEGABYTE = 1024 * 1024
const MAX_ZIP_ENTRIES = 10000
const MAX_TOTAL_BYTES = 200 * MEGABYTE
const MAX_ENTRY_BYTES = 50 * MEGABYTE
const CONTAINER_PATH = 'META-INF/container.xml'
const NCX_MEDIA_TYPE = 'application/x-dtbncx+xml'

const BLOCK_TYPE = new Map([
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

export async function parseEpub(buffer, filePath) {
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

  const chapters = []
  for (const item of spine.items) {
    const chapter = await readChapter(zip, item, tocTitles, chapters.length + 1)
    if (!chapter) continue
    chapters.push({
      id: `c${String(chapters.length + 1).padStart(3, '0')}`,
      href: posix.relative(opfDir, item.path),
      ...chapter,
    })
  }

  return {
    title: metadata.title || fallbackTitle,
    author: metadata.author,
    chapters,
    chars: chapters.reduce((sum, chapter) => sum + chapter.chars, 0),
  }
}

async function openZip(buffer) {
  let zip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch (error) {
    if (/encrypted/i.test(error?.message ?? '')) {
      throw new Error('EPUB 是加密压缩包，无法解析', { cause: error })
    }
    throw error
  }
  assertZipLimits(zip)
  return zip
}

function assertZipLimits(zip) {
  const entries = Object.values(zip.files)
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`EPUB 压缩包条目数超过 ${MAX_ZIP_ENTRIES} 个`)
  }
  let total = 0
  for (const entry of entries) {
    // JSZip 未公开条目大小，加载后的 _data 保存中央目录中的解压尺寸。
    const size = entry._data?.uncompressedSize ?? 0
    if (size > MAX_ENTRY_BYTES) {
      throw new Error(`EPUB 单个条目解压后超过 ${MAX_ENTRY_BYTES / MEGABYTE} MB：${entry.name}`)
    }
    total += size
    if (total > MAX_TOTAL_BYTES) {
      throw new Error(`EPUB 解压后总大小超过 ${MAX_TOTAL_BYTES / MEGABYTE} MB`)
    }
  }
}

async function readRequiredText(zip, path, message) {
  const entry = zip.file(path)
  if (!entry) throw new Error(message)
  return entry.async('string')
}

async function readOptionalText(zip, path) {
  const entry = zip.file(path)
  return entry ? entry.async('string') : null
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, 'text/xml')
}

function findOpfPath(containerXml) {
  const doc = parseXml(containerXml)
  const rootfile = findFirst(doc.documentElement, 'rootfile')
  const fullPath = rootfile?.getAttribute('full-path')?.trim()
  if (!fullPath) throw new Error('EPUB 的 container.xml 缺少 rootfile')
  return normalizeZipPath(fullPath)
}

function readManifest(packageElement, opfPath) {
  const manifest = new Map()
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

function readSpine(packageElement, manifest) {
  const spineElement = findFirst(packageElement, 'spine')
  const items = []
  if (spineElement) {
    for (const ref of elementChildren(spineElement)) {
      if (localName(ref) !== 'itemref') continue
      const item = manifest.get(ref.getAttribute('idref'))
      if (item) items.push(item)
    }
  }
  return { items, tocId: spineElement?.getAttribute('toc') ?? '' }
}

async function readTocTitles(zip, manifest, spineTocId) {
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

function findNcxItem(manifest, spineTocId) {
  const referenced = spineTocId ? manifest.get(spineTocId) : null
  if (referenced) return referenced
  return [...manifest.values()].find(item => item.mediaType === NCX_MEDIA_TYPE)
    ?? [...manifest.values()].find(item => item.path.toLowerCase().endsWith('.ncx'))
    ?? null
}

function parseNavTitles(text, navPath) {
  if (!text.trim()) return new Map()
  const { document } = parseHTML(text)
  const toc = [...document.querySelectorAll('nav')].find((nav) => {
    const type = nav.getAttribute('epub:type') ?? ''
    return type.split(/\s+/).some(value => value.toLowerCase() === 'toc')
  })
  const titles = new Map()
  if (!toc) return titles
  for (const anchor of toc.querySelectorAll('a[href]')) {
    const path = resolveHref(navPath, anchor.getAttribute('href'))
    const title = collapseWhitespace(anchor.textContent ?? '')
    if (path && title && !titles.has(path)) titles.set(path, title)
  }
  return titles
}

function parseNcxTitles(text, ncxPath) {
  const doc = parseXml(text)
  const titles = new Map()
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

async function readChapter(zip, item, tocTitles, ordinal) {
  const html = await readRequiredText(zip, item.path, `EPUB 缺少章节文件：${item.path}`)
  if (!html.trim()) return null
  const { document } = parseHTML(html)
  for (const node of document.querySelectorAll('script, style, noscript, template')) {
    node.remove()
  }
  const blocks = []
  if (document.body) collectBlocks(document.body, blocks)
  if (blocks.length === 0) return null
  const heading = blocks.find(block => block.type === 'h')
  return {
    title: tocTitles.get(item.path) ?? heading?.text ?? `第 ${ordinal} 章`,
    blocks,
    chars: chapterChars(blocks),
  }
}

function collectBlocks(parent, blocks) {
  for (const element of elementChildren(parent)) {
    const tag = (element.tagName ?? '').toLowerCase()
    const type = BLOCK_TYPE.get(tag)
    if (type) {
      const text = type === 'code' ? preText(element) : inlineText(element)
      if (!text) continue
      const block = { type, text }
      if (type === 'h') block.level = Number(tag.slice(1))
      blocks.push(block)
      continue
    }
    collectBlocks(element, blocks)
  }
}

function inlineText(element) {
  const parts = []
  appendInline(element, parts)
  return normalizeInline(parts.join(''))
}

function appendInline(node, parts) {
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

function normalizeInline(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function preText(element) {
  return (element.textContent ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '')
}

function chapterChars(blocks) {
  return blocks.map(block => block.text).join('\n\n').length
}

function readMetadata(packageElement) {
  const metadata = findFirst(packageElement, 'metadata')
  return {
    title: metadataValue(metadata, 'title'),
    author: metadataValue(metadata, 'creator'),
  }
}

function metadataValue(metadata, name) {
  if (!metadata) return ''
  for (const element of elementChildren(metadata)) {
    if (localName(element) !== name) continue
    const value = collapseWhitespace(element.textContent ?? '')
    if (value) return value
  }
  return ''
}

function collapseWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function resolveHref(basePath, href) {
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

function normalizeZipPath(path) {
  const decoded = decodePath(path.trim().replace(/\\/g, '/'))
  return posix.normalize(decoded.replace(/^\/+/, ''))
}

function decodePath(path) {
  try {
    return decodeURIComponent(path)
  } catch {
    // Malformed escapes stay literal so the entry lookup fails explicitly.
    return path
  }
}

function localName(element) {
  const name = element.localName || element.tagName || ''
  return name.slice(name.indexOf(':') + 1).toLowerCase()
}

function elementChildren(element) {
  return element?.children ? [...element.children] : []
}

function walkElements(root, visit) {
  for (const element of elementChildren(root)) {
    visit(element)
    walkElements(element, visit)
  }
}

function findFirst(root, name) {
  if (!root) return null
  if (localName(root) === name) return root
  for (const element of elementChildren(root)) {
    const found = findFirst(element, name)
    if (found) return found
  }
  return null
}

function findDirectChild(element, name) {
  return elementChildren(element).find(child => localName(child) === name) ?? null
}
