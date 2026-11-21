import type { ChapterContent } from '../../../shared/contracts/reading.ts'

export interface TranslationBlockView {
  index: number
  text: string
}

/** 跨章回翻落到章末时，优先预翻译的最后若干块。 */
const TRANSLATION_TAIL_BLOCKS = 12

function translationBlockAt(block: ChapterContent['blocks'][number], index: number): TranslationBlockView | null {
  if (block.type === 'image' || block.type === 'code') return null
  const text = block.type === 'table' && block.rows?.length
    ? block.rows.map(row => row.join(' | ')).join('\n')
    : block.text
  if (typeof text !== 'string' || !text.trim()) return null
  return { index, text }
}

/** Translatable paragraphs of one chapter; images and code stay untouched. */
export function translationBlocksOf(content: ChapterContent): TranslationBlockView[] {
  const blocks: TranslationBlockView[] = []
  content.blocks.forEach((block, index) => {
    const item = translationBlockAt(block, index)
    if (item) blocks.push(item)
  })
  return blocks
}

/** 章末预翻译从完整章节尾部扫描，不受一次翻译 80 段上限影响。 */
export function tailTranslationBlocksOf(
  content: ChapterContent,
  count = TRANSLATION_TAIL_BLOCKS,
): TranslationBlockView[] {
  const limit = Math.max(0, Math.floor(count))
  if (limit <= 0) return []
  const blocks: TranslationBlockView[] = []
  for (let index = content.blocks.length - 1; index >= 0 && blocks.length < limit; index -= 1) {
    const item = translationBlockAt(content.blocks[index], index)
    if (item) blocks.push(item)
  }
  return blocks.reverse()
}
