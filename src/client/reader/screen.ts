import type { BookDetail, Screen, TocItem, Visual } from '../common/types.ts'

let lastScreen: Screen = { kind: 'library' }

export function currentReaderScreen(): Screen {
  return lastScreen
}

export function rememberReaderScreen(screen: Screen): void {
  lastScreen = screen
}

/** Pick the visual rendering for one TOC entry; text formats have none. */
export function visualForItem(detail: BookDetail, item: TocItem | undefined, reflow = false): Visual | null {
  if (!detail || !item) return null
  if (detail.book.format === 'pdf') {
    if (reflow) return null
    return { kind: 'pdf', page: Number.isInteger(item.page) ? item.page! : 1, scale: 1.5 }
  }
  if (detail.book.format === 'epub' && typeof item.href === 'string' && item.href) {
    if (reflow) return null
    return { kind: 'epub', href: item.href }
  }
  return null
}

/** Rebuild the visual state for a chapter, e.g. after the panel remounts. */
export function visualForChapter(detail: BookDetail, chapterId: string | undefined, reflow = false): Visual | null {
  if (!detail || !chapterId) return null
  return visualForItem(detail, detail.toc.find(item => item.id === chapterId), reflow)
}
