/** Book formats the reader recognizes; kept shared because both halves decide. */
export type BookFormat = 'txt' | 'md' | 'epub' | 'pdf'

const FORMAT_BY_EXTENSION = new Map<string, BookFormat>([
  ['.txt', 'txt'],
  ['.text', 'txt'],
  ['.md', 'md'],
  ['.markdown', 'md'],
  ['.epub', 'epub'],
  ['.pdf', 'pdf'],
])

export function formatOf(filePath: string): BookFormat | null {
  const dot = filePath.lastIndexOf('.')
  if (dot < 0) return null
  return FORMAT_BY_EXTENSION.get(filePath.slice(dot).toLowerCase()) ?? null
}

export function isSupportedFormat(format: string | null | undefined): format is BookFormat {
  return format === 'txt' || format === 'md' || format === 'epub' || format === 'pdf'
}
