import type { BlockType, TextBlock } from '../../../../../shared/contracts/reading.ts'

export interface ManifestItem {
  id: string
  path: string
  mediaType: string
  properties: string[]
}

export interface ChapterContent {
  title: string
  blocks: TextBlock[]
  chars: number
}

export const MEGABYTE = 1024 * 1024
export const MAX_ZIP_ENTRIES = 10000
export const MAX_TOTAL_BYTES = 200 * MEGABYTE
export const MAX_ENTRY_BYTES = 50 * MEGABYTE
export const CONTAINER_PATH = 'META-INF/container.xml'
export const NCX_MEDIA_TYPE = 'application/x-dtbncx+xml'

export const BLOCK_TYPE = new Map<string, BlockType>([
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
