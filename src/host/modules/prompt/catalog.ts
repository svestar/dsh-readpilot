import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import type { ToolPromptLine } from '../tools/prompt-map.ts'

export interface PromptRule {
  id: string
  zh: string
  en: string
}

/** Stable rule ids make prompt checks structural instead of prose-based. */
export const PROMPT_RULES: PromptRule[] = [
  {
    id: 'book-reference',
    zh: '用户说“这本书”时先调用 `reader_context`；明确指定书名时按书名处理；无法确定时直接询问，不要猜。',
    en: 'When the user says “this book”, call `reader_context` first. If they name a book, use that book. If you cannot tell which book, ask; do not guess.',
  },
  {
    id: 'quotes',
    zh: '引用必须逐字来自工具结果并注明章节。',
    en: 'Quotes must be copied verbatim from tool results with the chapter.',
  },
  {
    id: 'missing-content',
    zh: '书里没有或工具未返回时，明确说“书里没找到”，不补全；工具报错或为空时如实说明。区分原文、作者观点与助手分析。',
    en: 'If the book or a tool result does not contain something, say “I could not find it in the book”; do not fill it in. Report tool errors or empty results honestly. Distinguish the source text, the author’s views and your analysis.',
  },
  {
    id: 'whole-book-digest',
    zh: '用户要求全书概括或通读时，先调用 `reader_digest`，基于章节摘要回答并说明是抽取式概括；不要逐章循环读全文，不要声称逐字读完。',
    en: 'When the user asks for a whole-book summary or to read the whole book, call `reader_digest` first and answer from chapter excerpts; state that it is extractive, do not loop through chapters with `reader_read`, and do not claim to have read every word.',
  },
  {
    id: 'tool-use',
    zh: '按需调用工具，以最新结果为准；工具报错或空结果如实说明。',
    en: 'Call tools as needed and trust the latest result; report tool errors or empty results honestly.',
  },
]

const PRINCIPLE = {
  zh: '**原则：不猜测、不编造、不擅自写入；以阅读器数据和用户明确意图为准。**',
  en: '**Principle: do not guess, invent, or write without permission; rely on reader data and the user’s explicit intent.**',
}

function rulesText(language: WorkspaceLanguage): string {
  return PROMPT_RULES.map((rule, index) => {
    const [first, ...rest] = (language === 'en' ? rule.en : rule.zh).split('\n')
    return [`${index + 1}. ${first}`, ...rest].join('\n')
  }).join('\n')
}

/** The discipline text without identity or tools; tools are injected separately. */
export const READING_PROMPT = [rulesText('zh'), '', PRINCIPLE.zh].join('\n')
export const READING_PROMPT_EN = [rulesText('en'), '', PRINCIPLE.en].join('\n')

function toolSection(language: WorkspaceLanguage, tools: readonly ToolPromptLine[]): string {
  if (tools.length === 0) return ''
  const english = language === 'en'
  const heading = english ? '**Core tools**' : '**核心工具**'
  const separator = english ? ': ' : '：'
  const period = english ? '.' : '。'
  return [
    heading,
    ...tools.map(tool => `- \`${tool.name}\`${separator}${english ? tool.en : tool.zh}${period}`),
  ].join('\n')
}

/** Build the full reading prompt for one language and the registered core tools. */
export function readingPrompt(language: WorkspaceLanguage, tools: readonly ToolPromptLine[]): string {
  const english = language === 'en'
  const parts: string[] = []
  const toolsText = toolSection(language, tools)
  if (toolsText) parts.push(toolsText, '')
  parts.push(english ? READING_PROMPT_EN : READING_PROMPT)
  return parts.join('\n')
}
