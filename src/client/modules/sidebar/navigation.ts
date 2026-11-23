import type { ComposerInputActions, Visual } from '../../lib/types.ts'
import { blockJumpFraction } from '../../lib/helpers.ts'
import { quoteDraft } from '../reader/SelectionNote.ts'

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

/**
 * 渲染后消费侧栏的待跳转块。块还没出现时返回 false，调用方保留 pending 等下一次渲染重试。
 */
export function consumePendingBlock(
  pending: { blockIndex: number; blockOffset: number } | null,
  root: Element | null,
  goToBlock: (blockIndex: number, fraction: number) => void,
): boolean {
  if (!pending) return false
  const block = root?.querySelector(`[data-block-index="${pending.blockIndex}"]`) ?? null
  if (!block) return false
  goToBlock(pending.blockIndex, blockJumpFraction(pending.blockOffset, block.textContent?.length ?? 0))
  return true
}


export interface SidebarBook {
  bookId: string
  title: string
  format: 'txt' | 'md' | 'epub' | 'pdf'
}

export type SidebarMode = 'text' | 'original'

/** PDF 原版与扫描版目录按页跳转；文本重排与其他格式按章节跳转。 */
export function tocUsesPages(format: SidebarBook['format'], mode: SidebarMode, scanOnly: boolean): boolean {
  return format === 'pdf' && (mode === 'original' || scanOnly)
}

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
