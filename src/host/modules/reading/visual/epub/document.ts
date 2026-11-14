import { readFile } from 'node:fs/promises'
import { join, posix } from 'node:path'
import { parseHTML } from 'linkedom'
import type { EpubDocumentResult } from '../../../../../shared/contracts/reading.ts'
import type { EpubArchive } from './archive.ts'
import { ASSET_ROOT } from './types.ts'
import {
  normalizeZipPath,
  resolveZipPath,
  splitReference,
} from './xml.ts'

export function createEpubDocument(archive: EpubArchive) {
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

  return async function readDocument(request: {
    bookId?: string
    filePath?: string
    href?: string
    assetBase?: string
    docBase?: string
  } = {}): Promise<EpubDocumentResult> {
    const { bookId, filePath, href, assetBase, docBase } = request
    const id = String(bookId ?? '')
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
    const meta = await archive.prepare({ bookId: id, filePath })
    if (typeof href !== 'string' || !href) throw new Error('href is required')
    const zipPath = normalizeZipPath(posix.join(meta.opfDir, href))
    const file = join(archive.bookRoot(id), ASSET_ROOT, zipPath)
    const htmlText = await readFile(file, 'utf8')
    const { document }: any = parseHTML(htmlText)
    for (const node of document.querySelectorAll('script, iframe, object, embed, form, input, button, textarea, select, base, link[rel="preload"]')) {
      node.remove()
    }
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of [...element.attributes]) {
        const name: string = attribute.name.toLowerCase()
        if (name.startsWith('on') || ['srcdoc', 'formaction', 'action', 'ping'].includes(name)) {
          element.removeAttribute(attribute.name)
          continue
        }
        if (['href', 'src', 'poster'].includes(name)) {
          const value: string = element.getAttribute(attribute.name) ?? ''
          const tag = String(element.localName ?? element.tagName ?? '').toLowerCase()
          if (name === 'href' && tag === 'a') {
            element.setAttribute('href', rewriteDocLink(value, zipPath, id, docBase, meta.opfDir))
          } else if (name === 'href' && tag === 'link') {
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
      style.textContent = 'html,body{margin:0;padding:0}*{user-select:text}img{max-width:100%;height:auto}mark.dsh-readpilot-highlight{background:var(--dsw-alias-state-warn-primary,#f5c542);color:inherit}'
      head.appendChild(style)
    }
    return {
      html: `<!DOCTYPE html>${document.documentElement.outerHTML}`,
      contentType: 'text/html; charset=utf-8',
    }
  }
}
