import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'
import JSZip from 'jszip'
import type { EpubManifestItem, EpubRecord } from './types.ts'
import {
  ASSET_ROOT,
  CONTAINER_PATH,
  MAX_ENTRIES,
  MAX_ENTRY_BYTES,
  MAX_TOTAL_BYTES,
} from './types.ts'
import {
  assertBookId,
  collapse,
  elementChildren,
  findAll,
  findFirst,
  localName,
  normalizeZipPath,
  parseXml,
  resolveZipPath,
} from './xml.ts'

function collapseWhitespace(text: unknown): string {
  return collapse(text)
}

export function readManifest(packageElement: any, opfPath: string): Map<string, EpubManifestItem> {
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

function readSpine(packageElement: any, manifest: Map<string, EpubManifestItem>): EpubManifestItem[] {
  const items: EpubManifestItem[] = []
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
  const title = metadata ? collapseWhitespace(findFirst(metadata, 'title')?.textContent) : ''
  const author = metadata ? collapseWhitespace(findFirst(metadata, 'creator')?.textContent) : ''
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

export interface EpubArchive {
  root: string
  bookRoot(bookId: string): string
  prepare(request?: { bookId?: string; filePath?: string }): Promise<EpubRecord>
}

export function createEpubArchive({ dataDir }: { dataDir: string }): EpubArchive {
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

  return { root: rootDir, bookRoot, prepare }
}

export { elementChildren, localName }
