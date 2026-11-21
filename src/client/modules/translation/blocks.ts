import type { ChapterContent } from '../../../shared/contracts/reading.ts'

export interface TranslationBlockView {
  index: number
  text: string
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
