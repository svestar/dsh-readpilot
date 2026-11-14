import type JSZip from 'jszip'
import { parseHTML } from 'linkedom'
import type { ManifestItem } from './types.ts'
import { NCX_MEDIA_TYPE } from './types.ts'
import { readOptionalText, resolveHref } from './zip.ts'
import {
  collapseWhitespace,
  findDirectChild,
  findFirst,
  localName,
  parseXml,
  walkElements,
} from './xml.ts'

export async function readTocTitles(zip: JSZip, manifest: Map<string, ManifestItem>, spineTocId: string): Promise<Map<string, string>> {
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
