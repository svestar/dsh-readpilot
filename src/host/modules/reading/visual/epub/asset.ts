import { readFile } from 'node:fs/promises'
import { join, posix, sep } from 'node:path'
import type { EpubAssetResult } from '../../../../../shared/contracts/reading.ts'
import type { EpubArchive } from './archive.ts'
import { ASSET_ROOT, CONTENT_TYPES } from './types.ts'
import { normalizeZipPath, resolveZipPath } from './xml.ts'

export function createEpubAsset(archive: EpubArchive) {
  async function readAsset(request: { bookId?: string; filePath?: string; path?: string } = {}): Promise<EpubAssetResult> {
    const { bookId, filePath, path } = request
    const id = String(bookId ?? '')
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
    await archive.prepare({ bookId: id, filePath })
    if (typeof path !== 'string' || !path) throw new Error('path is required')
    const safePath = normalizeZipPath(path)
    const root = join(archive.bookRoot(id), ASSET_ROOT)
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
      text = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match: string, _quote: string, value: string) => {
        if (/^data:/i.test(value) || value.startsWith('#')) return match
        if (/^(?:https?:)?\/\//i.test(value) || /^javascript:/i.test(value)) return 'url("")'
        const targetPath = resolveZipPath(safePath, value)
        if (!targetPath) return match
        const rewritten = `/api/dsh-readpilot/epub-asset?bookId=${encodeURIComponent(id)}&path=${encodeURIComponent(targetPath)}`
        return `url("${rewritten}")`
      })
      bytes = Buffer.from(text, 'utf8')
      contentType = CONTENT_TYPES.get('.css') ?? 'text/css; charset=utf-8'
    }
    return { bytes, contentType }
  }

  async function cover(request: { bookId?: string; filePath?: string } = {}): Promise<EpubAssetResult | null> {
    const id = String(request.bookId ?? '')
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
    const meta = await archive.prepare({ bookId: id, filePath: request.filePath })
    if (!meta.coverPath) return null
    const root = join(archive.bookRoot(id), ASSET_ROOT)
    const target = join(root, meta.coverPath)
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (target !== root && !target.startsWith(rootPrefix)) return null
    const bytes = await readFile(target).catch(() => null)
    if (!bytes) return null
    const extension = posix.extname(meta.coverPath).toLowerCase()
    return { bytes, contentType: CONTENT_TYPES.get(extension) ?? 'image/jpeg' }
  }

  return { readAsset, cover }
}
