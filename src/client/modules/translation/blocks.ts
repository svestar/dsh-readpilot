import type { ChapterContent } from '../../../shared/contracts/reading.ts'

export interface TranslationBlockView {
  index: number
  text: string
}

/** 跨章回翻落到章末时，优先预翻译的最后若干块。 */
const TRANSLATION_TAIL_BLOCKS = 12

/** 章末预翻译只取尾部若干块；章节不足时返回全部。 */
export function tailTranslationBlocks(
  blocks: readonly TranslationBlockView[],
  count = TRANSLATION_TAIL_BLOCKS,
): TranslationBlockView[] {
  const limit = Math.max(0, Math.floor(count))
  return limit > 0 ? blocks.slice(-limit) : []
}

/** Translatable paragraphs of one chapter; images and code stay untouched. */
export function translationBlocksOf(content: ChapterContent): TranslationBlockView[] {
  const blocks: TranslationBlockView[] = []
  content.blocks.forEach((block, index) => {
    if (blocks.length >= 80) return
    if (block.type === 'image' || block.type === 'code') return
    const text = block.type === 'table' && block.rows?.length
      ? block.rows.map(row => row.join(' | ')).join('\n')
      : block.text
    if (typeof text === 'string' && text.trim()) blocks.push({ index, text })
  })
  return blocks
}
