import { posix } from 'node:path'
import JSZip from 'jszip'
import type { ManifestItem } from './types.ts'
import {
  CONTAINER_PATH,
  MAX_ENTRY_BYTES,
  MAX_TOTAL_BYTES,
  MAX_ZIP_ENTRIES,
  MEGABYTE,
} from './types.ts'
import { elementChildren, findFirst, localName, parseXml } from './xml.ts'

export async function openZip(buffer: Buffer): Promise<JSZip> {
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

export async function readRequiredText(zip: JSZip, path: string, message: string): Promise<string> {
  const entry = zip.file(path)
  if (!entry) throw new Error(message)
  return entry.async('string')
}

export async function readOptionalText(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.file(path)
  return entry ? entry.async('string') : null
}

export function findOpfPath(containerXml: string): string {
  const doc = parseXml(containerXml)
  const rootfile = findFirst(doc.documentElement, 'rootfile')
  const fullPath = rootfile?.getAttribute('full-path')?.trim()
  if (!fullPath) throw new Error('EPUB 的 container.xml 缺少 rootfile')
  return normalizeZipPath(fullPath)
}

export function readManifest(packageElement: any, opfPath: string): Map<string, ManifestItem> {
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

export function readSpine(packageElement: any, manifest: Map<string, ManifestItem>): { items: ManifestItem[]; tocId: string } {
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

export { CONTAINER_PATH }

export function resolveHref(basePath: string, href: unknown): string | null {
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

export function normalizeZipPath(path: unknown): string {
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
