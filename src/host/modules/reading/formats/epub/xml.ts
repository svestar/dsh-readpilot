import { DOMParser } from 'linkedom'

export function parseXml(text: string): any {
  return new DOMParser().parseFromString(text, 'text/xml')
}

export function localName(element: any): string {
  const name = element.localName || element.tagName || ''
  return name.slice(name.indexOf(':') + 1).toLowerCase()
}

export function elementChildren(element: any): any[] {
  return element?.children ? [...element.children] : []
}

export function walkElements(root: any, visit: (element: any) => void): void {
  for (const element of elementChildren(root)) {
    visit(element)
    walkElements(element, visit)
  }
}

export function findFirst(root: any, name: string): any {
  if (!root) return null
  if (localName(root) === name) return root
  for (const element of elementChildren(root)) {
    const found = findFirst(element, name)
    if (found) return found
  }
  return null
}

export function findDirectChild(element: any, name: string): any {
  return elementChildren(element).find(child => localName(child) === name) ?? null
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
