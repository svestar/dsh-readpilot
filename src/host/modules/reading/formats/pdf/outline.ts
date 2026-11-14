import type { OutlineEntry } from '../../formats.ts'

export function metadataText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

export async function readOutline(pdf: any): Promise<OutlineEntry[]> {
  let raw: any
  try {
    raw = await pdf.getOutline()
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const entries: OutlineEntry[] = []
  const visit = async (items: any[], level: number): Promise<void> => {
    for (const item of items) {
      if (entries.length >= 500) break
      const title = metadataText(item?.title)
      if (title) {
        let page: number | null = null
        try {
          const destination = typeof item.dest === 'string'
            ? await pdf.getDestination(item.dest)
            : item.dest
          if (Array.isArray(destination) && destination[0]) {
            const index = await pdf.getPageIndex(destination[0])
            if (Number.isInteger(index) && index >= 0) page = index + 1
          }
        } catch {
          page = null
        }
        if (page) {
          entries.push({
            id: `o${String(entries.length + 1).padStart(3, '0')}`,
            title,
            level,
            page,
          })
        }
      }
      if (Array.isArray(item?.items) && item.items.length > 0) {
        await visit(item.items, level + 1)
      }
    }
  }
  await visit(raw, 0)
  return entries
}
