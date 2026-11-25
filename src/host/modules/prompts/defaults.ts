import type { PromptPreset } from '../../../shared/contracts/prompts.ts'

export const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'explain',
    title: '解释这段',
    template: '解释这段，结合《{{book}}》{{chapter}} 的上下文：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'terms',
    title: '术语与典故',
    template: '解释这段里的术语、典故和背景：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'translate',
    title: 'AI 精译',
    template: '翻译这段（中译英或英译中），保留语气；必要时解释术语：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'followup',
    title: '继续追问',
    template: '关于《{{book}}》{{chapter}}：\n\n{{selection}}\n\n我想继续追问：',
    builtin: true,
  },
  {
    id: 'summarize',
    title: '总结要点',
    template: '总结这段，列三个要点：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'character',
    title: '人物关系',
    template: '梳理这段的人物、关系和动机：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'craft',
    title: '写作手法',
    template: '分析这段的写作手法、节奏和意象：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'background',
    title: '背景知识',
    template: '补充这段的时代、文化、作者或典故背景：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'argument',
    title: '观点与论证',
    template: '提炼这段的观点、论据和隐含假设：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'quote',
    title: '金句摘录',
    template: '摘出这段最值得记的句子，说明理由：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'questions',
    title: '提问清单',
    template: '根据这段提五个由浅入深的问题：\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'connect',
    title: '联系全书',
    template: '把这段与《{{book}}》前后文或主题联系起来：\n\n{{selection}}',
    builtin: true,
  },
]

export const DEFAULT_PROMPT_PRESETS_EN: PromptPreset[] = [
  {
    id: 'explain',
    title: 'Explain this passage',
    template: 'Explain this passage in the context of “{{book}}” {{chapter}}:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'terms',
    title: 'Terms and allusions',
    template: 'Explain the terms, allusions and background in this passage:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'translate',
    title: 'AI translation',
    template: 'Translate this passage (Chinese to English or English to Chinese), preserving tone; explain terminology when needed:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'followup',
    title: 'Continue asking',
    template: 'About “{{book}}” {{chapter}}:\n\n{{selection}}\n\nI want to follow up:',
    builtin: true,
  },
  {
    id: 'summarize',
    title: 'Summarize',
    template: 'Summarize this passage in three points:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'character',
    title: 'Characters and relationships',
    template: 'Map the characters, relationships and motives in this passage:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'craft',
    title: 'Writing technique',
    template: 'Analyze the writing technique, pacing and imagery in this passage:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'background',
    title: 'Background knowledge',
    template: 'Add the historical, cultural, author or allusion background needed to understand this passage:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'argument',
    title: 'Claims and arguments',
    template: 'Extract the claims, evidence and assumptions in this passage:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'quote',
    title: 'Notable quotes',
    template: 'Pick the most memorable sentence in this passage and explain why:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'questions',
    title: 'Questions',
    template: 'Ask five questions about this passage, from easy to deep:\n\n{{selection}}',
    builtin: true,
  },
  {
    id: 'connect',
    title: 'Connect to the book',
    template: 'Connect this passage to the rest of “{{book}}” or its themes:\n\n{{selection}}',
    builtin: true,
  },
]

export const LEGACY_DEFAULT_TEMPLATES: Record<string, string> = {
  explain: '请解释下面这段内容，并结合《{{book}}》{{chapter}} 的上下文说明它的意思：\n\n{{selection}}',
  terms: '请解释下面这段内容中的术语、典故和背景，并说明它们在本文中的含义：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
  translate: '请把下面这段内容翻译成中文；如果原文是中文，翻译成英文。保留语气和段落：\n\n{{selection}}',
  followup: '关于《{{book}}》{{chapter}} 的这段内容：\n\n{{selection}}\n\n我想继续追问：',
  summarize: '请总结下面这段内容，并列出三个要点：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
  character: '请梳理这段内容涉及的人物、关系与动机，并指出前后文可能对应的线索：\n\n{{selection}}',
  craft: '请分析这段文字的写作手法，包括叙述视角、节奏、修辞和意象，并举例说明：\n\n{{selection}}',
  background: '请补充理解这段内容所需的时代、文化、作者或典故背景，并说明它如何影响理解：\n\n{{selection}}',
  argument: '请提炼这段内容的核心观点、论据和隐含假设，并指出可以质疑的地方：\n\n{{selection}}',
  quote: '请从这段内容中摘出最值得记诵的句子，并说明理由：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
  questions: '请基于这段内容生成五个由浅入深的问题，帮助我检查理解：\n\n{{selection}}',
  connect: '请把这段内容与《{{book}}》的前后文或全书主题联系起来，指出呼应、反差和伏笔：\n\n{{selection}}\n\n本书相关批注：\n{{notes}}',
}
