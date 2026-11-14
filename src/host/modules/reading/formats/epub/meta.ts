import { collapseWhitespace, elementChildren, findFirst, localName } from './xml.ts'

export function readMetadata(packageElement: any): { title: string; author: string } {
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
