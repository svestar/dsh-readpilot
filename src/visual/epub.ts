import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, posix, sep } from 'node:path'
import JSZip from 'jszip'
import { DOMParser, parseHTML } from 'linkedom'

export interface EpubDocumentResult {
  html: string
  contentType: string
}

export interface EpubAssetResult {
  bytes: Buffer
  contentType: string
}

export interface EpubVisual {
  prepare(request?: { bookId?: string; filePath?: string }): Promise<EpubRecord>
  readDocument(request?: {
    bookId?: string
    filePath?: string
    href?: string
    assetBase?: string
    docBase?: string
    reflow?: boolean
  }): Promise<EpubDocumentResult>
  readAsset(request?: { bookId?: string; filePath?: string; path?: string }): Promise<EpubAssetResult>
  cover(request?: { bookId?: string; filePath?: string }): Promise<EpubAssetResult | null>
}

interface EpubManifestItem {
  id: string
  path: string
  mediaType: string
  properties: string[]
}

export interface EpubRecord {
  sourceMtimeMs: number
  sourceSize: number
  title: string
  author: string
  opfPath: string
  opfDir: string
  coverPath: string | null
  spine: Array<{ id: string; href: string }>
}

const MEGABYTE = 1024 * 1024
const MAX_ENTRIES = 10000
const MAX_ENTRY_BYTES = 50 * MEGABYTE
const MAX_TOTAL_BYTES = 200 * MEGABYTE
const CONTAINER_PATH = 'META-INF/container.xml'
const ASSET_ROOT = 'files'
const REFLOW_CSS = `
html,body{margin:0;padding:0;background:transparent;color:inherit}
html{font-size:18px}
body{font-family:"Noto Serif SC","Source Han Serif SC","Songti SC",serif;line-height:1.8;text-align:justify;overflow-wrap:break-word}
p{margin:0 0 .75em;text-indent:2em}
h1,h2,h3,h4,h5,h6{margin:1.1em 0 .6em;line-height:1.35;text-indent:0}
ul,ol{margin:0 0 .8em;padding-left:1.6em}
li{margin:0 0 .35em}
img,svg{max-width:100%;height:auto;break-inside:avoid}
figure{margin:.8em 0;break-inside:avoid}
blockquote{margin:.6em 0;padding-left:.8em;border-left:3px solid currentColor;opacity:.85}
pre{white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.85em;background:rgba(127,127,127,.12);padding:.6em .8em;border-radius:6px;break-inside:avoid}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em}
table{max-width:100%;border-collapse:collapse;font-size:.9em;break-inside:avoid}
th,td{border:1px solid currentColor;padding:.3em .5em}
a{color:inherit;text-decoration:underline}
hr{border:0;border-top:1px solid currentColor;opacity:.35;margin:1.2em 0}
`
const CONTENT_TYPES = new Map<string, string>([
  ['.css', 'text/css; charset=utf-8'],
  ['.xhtml', 'application/xhtml+xml'],
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.js', 'text/plain; charset=utf-8'],
])

function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
  return bookId
}

function normalizeZipPath(path: unknown): string {
  const normalized = posix.normalize(String(path ?? '').replace(/\\/g, '/')).replace(/^\/+/, '')
  if (!normalized || normalized.startsWith('../') || normalized === '..') {
    throw new Error(`invalid EPUB path: ${String(path)}`)
  }
  return normalized
}

function resolveZipPath(basePath: string, href: unknown): string {
  const value = String(href ?? '').trim()
  if (!value || value.startsWith('#')) return ''
  if (/^(?:[a-z]+:)?\/\//i.test(value) || /^[a-z][a-z0-9+.-]*:/i.test(value)) return ''
  const clean = value.split('#')[0].split('?')[0]
  if (!clean) return ''
  return normalizeZipPath(posix.join(posix.dirname(basePath), decodeURIComponent(clean)))
}

function splitReference(value: string): { path: string; suffix: string } {
  const index = value.search(/[?#]/)
  return index === -1
    ? { path: value, suffix: '' }
    : { path: value.slice(0, index), suffix: value.slice(index) }
}

function localName(element: any): string {
  return String(element?.localName ?? element?.tagName ?? '').toLowerCase().split(':').pop() ?? ''
}

function elementChildren(element: any): any[] {
  return [...(element?.children ?? [])]
}

function findFirst(element: any, name: string): any {
  for (const child of elementChildren(element)) {
    if (localName(child) === name) return child
    const nested = findFirst(child, name)
    if (nested) return nested
  }
  return null
}

function findAll(element: any, name: string): any[] {
  const result: any[] = []
  for (const child of elementChildren(element)) {
    if (localName(child) === name) result.push(child)
    result.push(...findAll(child, name))
  }
  return result
}

function parseXml(text: string): any {
  const document = new DOMParser().parseFromString(text, 'text/xml')
  if (!document?.documentElement) throw new Error('EPUB XML 解析失败')
  return document
}

function collapse(text: unknown): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

function readManifest(packageElement: any, opfPath: string): Map<string, EpubManifestItem> {
  const manifest = new Map<string, EpubManifestItem>()
  for (const item of findAll(packageElement, 'item')) {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (!id || !href) continue
    const path = resolveZipPath(opfPath, href)
    if (!path) continue
    manifest.set(id, {
      id,
      path,
      mediaType: (item.getAttribute('media-type') ?? '').toLowerCase(),
      properties: (item.getAttribute('properties') ?? '').split(/\s+/).filter(Boolean),
    })
  }
  return manifest
}

function readSpine(packageElement: any, manifest: Map<string, EpubManifestItem>): EpubManifestItem[] {  const items: EpubManifestItem[] = []
  for (const ref of findAll(packageElement, 'itemref')) {
    const item = manifest.get(ref.getAttribute('idref'))
    if (item) items.push(item)
  }
  return items
}

function findCoverPath(packageElement: any, manifest: Map<string, EpubManifestItem>, opfPath: string): string | null {
  const metadata = findFirst(packageElement, 'metadata')
  if (metadata) {
    for (const meta of findAll(metadata, 'meta')) {
      if (String(meta.getAttribute('name') ?? '').toLowerCase() !== 'cover') continue
      const item = manifest.get(String(meta.getAttribute('content') ?? ''))
      if (item && item.mediaType.startsWith('image/')) return item.path
    }
  }
  for (const item of manifest.values()) {
    if (item.properties.includes('cover-image') && item.mediaType.startsWith('image/')) return item.path
  }
  const guide = findFirst(packageElement, 'guide')
  if (guide) {
    for (const ref of findAll(guide, 'reference')) {
      if (String(ref.getAttribute('type') ?? '').toLowerCase() !== 'cover') continue
      const target = resolveZipPath(opfPath, ref.getAttribute('href'))
      if (!target) continue
      for (const item of manifest.values()) {
        if (item.path === target && item.mediaType.startsWith('image/')) return item.path
      }
    }
  }
  return null
}

function readMetadata(packageElement: any): { title: string; author: string } {
  const metadata = findFirst(packageElement, 'metadata')
  const title = metadata ? collapse(findFirst(metadata, 'title')?.textContent) : ''
  const author = metadata ? collapse(findFirst(metadata, 'creator')?.textContent) : ''
  return { title, author }
}

async function loadZip(filePath: string): Promise<{ zip: JSZip; info: Awaited<ReturnType<typeof stat>> }> {
  const info = await stat(filePath)
  const zip = await JSZip.loadAsync(await readFile(filePath))
  const entries = Object.values(zip.files).filter(entry => !entry.dir)
  if (entries.length > MAX_ENTRIES) throw new Error(`EPUB 条目超过 ${MAX_ENTRIES} 个`)
  let total = 0
  for (const entry of entries) {
    const size = (entry as any)._data?.uncompressedSize ?? 0
    if (size > MAX_ENTRY_BYTES) throw new Error(`EPUB 单条解压后超过 50 MB：${entry.name}`)
    total += size
    if (total > MAX_TOTAL_BYTES) throw new Error('EPUB 解压后总大小超过 200 MB')
  }
  return { zip, info }
}

export function createEpubVisual({ dataDir }: { dataDir?: string } = {}): EpubVisual {
  if (typeof dataDir !== 'string' || !dataDir) throw new Error('dataDir is required')
  const rootDir = dataDir

  function bookRoot(bookId: string): string {
    return join(rootDir, 'assets', assertBookId(bookId))
  }

  async function prepare(request: { bookId?: string; filePath?: string } = {}): Promise<EpubRecord> {
    const { bookId, filePath } = request
    const id = assertBookId(bookId)
    if (typeof filePath !== 'string' || !filePath) throw new Error('filePath is required')
    const root = bookRoot(id)
    const metaPath = join(root, 'meta.json')
    const info = await stat(filePath)
    try {
      const cached: any = JSON.parse(await readFile(metaPath, 'utf8'))
      if (cached.sourceMtimeMs === info.mtimeMs && cached.sourceSize === info.size && 'coverPath' in cached) {
        await stat(join(root, ASSET_ROOT, cached.opfPath))
        return cached
      }
    } catch {
      // Rebuild missing or stale assets.
    }

    await rm(root, { recursive: true, force: true })
    await mkdir(join(root, ASSET_ROOT), { recursive: true })
    const { zip } = await loadZip(filePath)
    const container = zip.file(CONTAINER_PATH)
    if (!container) throw new Error('EPUB 缺少 META-INF/container.xml')
    const containerDoc: any = parseXml(await container.async('string'))
    const rootfile = findFirst(containerDoc.documentElement, 'rootfile')
    const opfPath = normalizeZipPath(rootfile?.getAttribute('full-path'))
    const opfEntry = zip.file(opfPath)
    if (!opfEntry) throw new Error(`EPUB 找不到 OPF：${opfPath}`)
    const packageDoc: any = parseXml(await opfEntry.async('string'))
    const packageElement = packageDoc.documentElement
    const metadata = readMetadata(packageElement)
    const manifest = readManifest(packageElement, opfPath)
    const spine = readSpine(packageElement, manifest)
    const opfDir = posix.dirname(opfPath)

    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue
      const path = normalizeZipPath(entry.name)
      const target = join(root, ASSET_ROOT, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, await entry.async('nodebuffer'))
    }

    const record: EpubRecord = {
      sourceMtimeMs: info.mtimeMs,
      sourceSize: info.size,
      title: metadata.title,
      author: metadata.author,
      opfPath,
      opfDir,
      coverPath: findCoverPath(packageElement, manifest, opfPath),
      spine: spine.map(item => ({
        id: item.id,
        href: posix.relative(opfDir, item.path),
      })),
    }
    await writeFile(metaPath, `${JSON.stringify(record)}\n`, 'utf8')
    return record
  }

  function assetUrl(bookId: string, path: string, base: string | undefined): string {
    return `${base}?bookId=${encodeURIComponent(bookId)}&path=${encodeURIComponent(path)}`
  }

  function rewriteUrl(value: string, currentPath: string, bookId: string, assetBase: string | undefined): string {
    const raw = String(value ?? '').trim()
    if (!raw || raw.startsWith('#')) return value
    if (/^data:/i.test(raw)) return raw
    if (/^(?:https?:)?\/\//i.test(raw) || /^javascript:/i.test(raw)) return ''
    const { suffix } = splitReference(raw)
    const target = resolveZipPath(currentPath, raw)
    if (!target) return suffix
    return `${assetUrl(bookId, target, assetBase)}${suffix}`
  }

  function rewriteDocLink(value: string, currentPath: string, bookId: string, docBase: string | undefined, opfDir: string): string {
    const raw = String(value ?? '').trim()
    if (!raw) return value
    if (raw.startsWith('#')) return raw
    if (/^(?:https?:)?\/\//i.test(raw) || /^javascript:/i.test(raw)) return ''
    const { suffix } = splitReference(raw)
    const target = resolveZipPath(currentPath, raw)
    if (!target) return suffix
    const href = posix.relative(opfDir, target)
    return `${docBase}?bookId=${encodeURIComponent(bookId)}&href=${encodeURIComponent(href)}${suffix}`
  }

  async function readDocument(request: {
    bookId?: string
    filePath?: string
    href?: string
    assetBase?: string
    docBase?: string
    reflow?: boolean
  } = {}): Promise<EpubDocumentResult> {
    const { bookId, filePath, href, assetBase, docBase, reflow = false } = request
    const id = assertBookId(bookId)
    const meta = await prepare({ bookId: id, filePath })
    if (typeof href !== 'string' || !href) throw new Error('href is required')
    const zipPath = normalizeZipPath(posix.join(meta.opfDir, href))
    const file = join(bookRoot(id), ASSET_ROOT, zipPath)
    const htmlText = await readFile(file, 'utf8')
    const { document }: any = parseHTML(htmlText)
    for (const node of document.querySelectorAll('script, iframe, object, embed, form, input, button, textarea, select, base, link[rel="preload"]')) {
      node.remove()
    }
    if (reflow) {
      for (const node of document.querySelectorAll('link, style')) node.remove()
    }
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of [...element.attributes]) {
        const name: string = attribute.name.toLowerCase()
        if (reflow && name === 'style') {
          element.removeAttribute(attribute.name)
          continue
        }
        if (name.startsWith('on') || ['srcdoc', 'formaction', 'action', 'ping'].includes(name)) {
          element.removeAttribute(attribute.name)
          continue
        }
        if (['href', 'src', 'poster'].includes(name)) {
          const value: string = element.getAttribute(attribute.name) ?? ''
          if (name === 'href' && localName(element) === 'a') {
            element.setAttribute('href', rewriteDocLink(value, zipPath, id, docBase, meta.opfDir))
          } else if (name === 'href' && localName(element) === 'link') {
            const rel = (element.getAttribute('rel') ?? '').toLowerCase()
            if (!rel.split(/\s+/).includes('stylesheet')) {
              element.remove()
              break
            }
            element.setAttribute('href', rewriteUrl(value, zipPath, id, assetBase))
          } else {
            element.setAttribute(name, rewriteUrl(value, zipPath, id, assetBase))
          }
        }
      }
    }
    const head: any = document.head ?? document.querySelector('head')
    if (head) {
      const style: any = document.createElement('style')
      style.setAttribute('data-dsh-readpilot', '')
      if (reflow) style.setAttribute('data-dsh-reflow', '')
      style.textContent = reflow
        ? `${REFLOW_CSS}*{user-select:text}mark.dsh-readpilot-highlight{background:var(--dsw-alias-state-warn-primary,#f5c542);color:inherit}`
        : 'html,body{margin:0;padding:0}*{user-select:text}img{max-width:100%;height:auto}mark.dsh-readpilot-highlight{background:var(--dsw-alias-state-warn-primary,#f5c542);color:inherit}'
      head.appendChild(style)
    }
    return {
      html: `<!DOCTYPE html>${document.documentElement.outerHTML}`,
      contentType: 'text/html; charset=utf-8',
    }
  }

  async function readAsset(request: { bookId?: string; filePath?: string; path?: string } = {}): Promise<EpubAssetResult> {
    const { bookId, filePath, path } = request
    const id = assertBookId(bookId)
    await prepare({ bookId: id, filePath })
    if (typeof path !== 'string' || !path) throw new Error('path is required')
    const safePath = normalizeZipPath(path)
    const root = join(bookRoot(id), ASSET_ROOT)
    const target = join(root, safePath)
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (target !== root && !target.startsWith(rootPrefix)) {
      throw new Error('asset path escapes EPUB root')
    }
    let bytes = await readFile(target)
    const extension = posix.extname(safePath).toLowerCase()
    let contentType: string = CONTENT_TYPES.get(extension) ?? 'application/octet-stream'
    if (extension === '.css') {
      let text = bytes.toString('utf8')
      text = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match: string, quote: string, value: string) => {
        if (/^data:/i.test(value) || value.startsWith('#')) return match
        if (/^(?:https?:)?\/\//i.test(value) || /^javascript:/i.test(value)) return 'url("")'
        const targetPath = resolveZipPath(safePath, value)
        if (!targetPath) return match
        const rewritten = assetUrl(id, targetPath, '/api/dsh-readpilot/epub-asset')
        return `url("${rewritten}")`
      })
      bytes = Buffer.from(text, 'utf8')
      contentType = CONTENT_TYPES.get('.css') ?? 'text/css; charset=utf-8'
    }
    return { bytes, contentType }
  }

  async function cover(request: { bookId?: string; filePath?: string } = {}): Promise<EpubAssetResult | null> {
    const id = assertBookId(request.bookId)
    const meta = await prepare({ bookId: id, filePath: request.filePath })
    if (!meta.coverPath) return null
    const root = join(bookRoot(id), ASSET_ROOT)
    const target = join(root, meta.coverPath)
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (target !== root && !target.startsWith(rootPrefix)) return null
    const bytes = await readFile(target).catch(() => null)
    if (!bytes) return null
    const extension = posix.extname(meta.coverPath).toLowerCase()
    return { bytes, contentType: CONTENT_TYPES.get(extension) ?? 'image/jpeg' }
  }

  return { prepare, readDocument, readAsset, cover }
}
