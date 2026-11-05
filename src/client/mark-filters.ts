export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const

export interface MarkLike {
  kind: string
  chapterId: string
  color?: string
}

export interface MarkFilter {
  chapterId?: string | null
  color?: string | null
}

/** Apply the chapter and color filters to a mark list; empty filters keep everything. */
export function filterMarks<T extends MarkLike>(marks: readonly T[], filter: MarkFilter = {}): T[] {
  const chapterId = filter.chapterId ?? null
  const color = filter.color ?? null
  if (!chapterId && !color) return marks.slice()
  return marks.filter(mark => {
    if (chapterId && mark.chapterId !== chapterId) return false
    if (color && !(mark.kind === 'highlight' && (mark.color ?? 'yellow') === color)) return false
    return true
  })
}

/** Chapter ids that actually contain marks, in first-seen order. */
export function markChapterIds(marks: readonly MarkLike[]): string[] {
  const ids: string[] = []
  for (const mark of marks) {
    if (mark.chapterId && !ids.includes(mark.chapterId)) ids.push(mark.chapterId)
  }
  return ids
}

/** Highlight colors used by at least one mark, in palette order. */
export function markColors(marks: readonly MarkLike[]): string[] {
  const used = new Set<string>()
  for (const mark of marks) {
    if (mark.kind !== 'highlight') continue
    used.add(mark.color ?? 'yellow')
  }
  return HIGHLIGHT_COLORS.filter(color => used.has(color))
}
