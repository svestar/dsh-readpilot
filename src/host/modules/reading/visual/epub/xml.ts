import { posix } from 'node:path'
import { DOMParser } from 'linkedom'

export function assertBookId(bookId: unknown): string {
  if (typeof bookId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(bookId)) {
    throw new Error('bookId must match [A-Za-z0-9_-]{1,64}')
  }
  return bookId
}

export function normalizeZipPath(path: unknown): string {
  const normalized = posix.normalize(String(path ?? '').replace(/\\/g, '/')).replace(/^\/+/, '')
  if (!normalized || normalized.startsWith('../') || normalized === '..') {
    throw new Error(`invalid EPUB path: ${String(path)}`)
  }
  return normalized
}

export function resolveZipPath(basePath: string, href: unknown): string {
  const value = String(href ?? '').trim()
  if (!value || value.startsWith('#')) return ''
  if (/^(?:[a-z]+:)?\/\//i.test(value) || /^[a-z][a-z0-9+.-]*:/i.test(value)) return ''
  const clean = value.split('#')[0].split('?')[0]
  if (!clean) return ''
  return normalizeZipPath(posix.join(posix.dirname(basePath), decodeURIComponent(clean)))
}

export function splitReference(value: string): { path: string; suffix: string } {
  const index = value.search(/[?#]/)
  return index === -1
    ? { path: value, suffix: '' }
    : { path: value.slice(0, index), suffix: value.slice(index) }
}

export function localName(element: any): string {
  return String(element?.localName ?? element?.tagName ?? '').toLowerCase().split(':').pop() ?? ''
}

export function elementChildren(element: any): any[] {
  return [...(element?.children ?? [])]
}

export function findFirst(element: any, name: string): any {
  for (const child of elementChildren(element)) {
    if (localName(child) === name) return child
    const nested = findFirst(child, name)
    if (nested) return nested
  }
  return null
}

export function findAll(element: any, name: string): any[] {
  const result: any[] = []
  for (const child of elementChildren(element)) {
    if (localName(child) === name) result.push(child)
    result.push(...findAll(child, name))
  }
  return result
}

export function parseXml(text: string): any {
  const document = new DOMParser().parseFromString(text, 'text/xml')
  if (!document?.documentElement) throw new Error('EPUB XML 解析失败')
  return document
}

export function collapse(text: unknown): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}
