import type { ComposerInputActions, Visual } from '../types.ts'
import { quoteDraft } from '../reader/selection-note.ts'

export function preserveSidebarVisual(previous: Visual | null, next: Visual | null, bookChanged: boolean): Visual | null {
  if (bookChanged || previous === null) return next
  if (previous.kind === 'pdf') return previous
  if (previous.kind === 'epub' && next?.kind === 'epub' && next.href === previous.href) return previous
  return next
}

export function chapterFractionForOffset(
  blocks: ReadonlyArray<{ text: string }> | null | undefined,
  offset: number | null,
): number | null {
  if (offset === null || !Number.isFinite(offset)) return null
  const chars = (blocks ?? []).reduce((sum, block) => sum + (block.text?.length ?? 0), 0)
  if (chars <= 0) return null
  return Math.max(0, Math.min(1, offset / chars))
}


export interface SidebarBook {
  bookId: string
  title: string
  format: 'txt' | 'md' | 'epub' | 'pdf'
}

export type SidebarMode = 'text' | 'original'

/**
 * Put a selected passage into the session composer.
 * @param actions - the session's composer actions, when the host provides them.
 * @param text - selected reader text.
 * @returns whether the quote reached the composer.
 */
export function prefillCompanionQuote(actions: ComposerInputActions | null | undefined, text: string): boolean {
  const quote = text.trim()
  if (!quote) return false
  try {
    if (actions?.insertQuote?.(quote)) return true
  } catch {
    // Older or busy composers fall through to the plain draft write.
  }
  try {
    actions?.setDraft?.(quoteDraft(quote))
  } catch {
    return false
  }
  return typeof actions?.setDraft === 'function'
}
