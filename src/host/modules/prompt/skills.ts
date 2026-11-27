import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'

export interface WorkspaceSkill {
  name: string
  description: string
  zh: string
  en: string
}

/** On-demand workflows generated into the library workspace as DSH skills. */
export const WORKSPACE_SKILLS: readonly WorkspaceSkill[] = [
  {
    name: 'dsh-readpilot-notes',
    description: 'Use when the user asks to annotate a passage, write or organize chapter, topic or whole-book notes, or revise or delete notes in dsh-readpilot. 当用户要求在原文旁批注、整理章节/主题/全书笔记，或修改、删除笔记时使用。',
    zh: [
      '# 阅读笔记流程',
      '',
      '只在用户明确要求时写笔记。需要已绑定书籍；没有当前书时先让用户打开或指定一本书。',
      '',
      '## 选择类型',
      '- 用户选中或引用一段原文，只需要一句简短看法：`reader_note`。`note` 为空时是划线。',
      '- 要整理章节、主题或全书：`reader_notes`。',
      '- 不确定时问：“记在这段原文旁，还是整理成一篇长笔记？”',
      '',
      '## 写入与修改',
      '- `reader_note` 的 update/delete 只对已有 `noteId` 操作，并且只在用户明确要求修改或删除时执行。',
      '- 长笔记修改前先 `index` / `read` 找到相关笔记，保留用户原有观点。',
      '- `reader_notes` 的 `create` / `write` / `append` 默认只生成待确认草稿，由用户在笔记页应用；自动应用开启时除外。',
      '- `delete` 立即删除，只在明确要求时执行。',
      '- `body` / `text` 只写正文，不要写“未保存”“待确认”等状态。',
      '',
      '## 回报',
      '- 保存状态以工具结果为准：长笔记看 `applied`，短批注看 `note` / `deleted`。',
      '- 草稿未应用时说“已生成草稿，等待你在笔记页确认”，不要说已保存。',
    ].join('\n'),
    en: [
      '# Reading notes workflow',
      '',
      'Write notes only when the user explicitly asks. A book binding is required; if there is no current book, ask the user to open or name one first.',
      '',
      '## Choose the note type',
      '- A selected or quoted passage with a short comment: `reader_note`. Empty `note` text creates a highlight.',
      '- A chapter, topic or whole-book write-up: `reader_notes`.',
      '- If unsure, ask: “Should I note this next to the passage, or turn it into a long note?”',
      '',
      '## Write and revise',
      '- Use update/delete on `reader_note` only with an existing `noteId`, and only when the user explicitly asks to revise or delete it.',
      '- Before rewriting a long note, use `index` / `read` to find the related note and preserve the user’s views.',
      '- `reader_notes` `create` / `write` / `append` create a pending draft for the user to apply in the notes panel, unless auto-apply is on.',
      '- `delete` removes the note immediately and only on explicit request.',
      '- `body` / `text` is the document only; never add “unsaved” or “pending” status text.',
      '',
      '## Report status',
      '- Use tool results for status: `applied` for long notes, `note` / `deleted` for short annotations.',
      '- If a draft is not applied, say it is waiting in the notes panel; never claim it was saved.',
    ].join('\n'),
  },
  {
    name: 'dsh-readpilot-memory',
    description: 'Use when the user asks to remember preferences, views, recurring questions or goals, or to read, update or forget reading memory in dsh-readpilot. 当用户要求记住偏好、观点、长期问题或目标，或读取、修改、遗忘阅读记忆时使用。',
    zh: [
      '# 阅读记忆流程',
      '',
      '先确认开关：记忆默认关闭；本书卡还要求这本书的记忆开启，读者卡只要求全局记忆开启。没有开启时不要写入，可提示用户在记忆页开启。',
      '',
      '## 可记内容',
      '- 长期有效的偏好、对书或作者的观点、反复出现的问题和目标。',
      '- 不记情节、一次性问题、阅读进度，或能从 `reader_context` 得到的信息。',
      '- 不在这里记录角色或人设；角色在角色页设置。',
      '',
      '## 写法',
      '- 每条一行，不超过 60 字；每张卡不超过 600 字。',
      '- 接近上限时先读取，再用 `replace` 压缩写回，不要一直追加。',
      '- 只有工具返回 `saved` 才能说已记住。',
    ].join('\n'),
    en: [
      '# Reading memory workflow',
      '',
      'Check the switches first: memory is off by default. The book card also requires this book’s memory to be on; the reader card only requires global memory. Do not write while memory is off; point the user to the memory panel to enable it.',
      '',
      '## What to record',
      '- Durable preferences, views on the book or author, recurring questions and goals.',
      '- Never plot facts, one-off questions, reading progress or facts available from `reader_context`.',
      '- Never store roles or personas here; the role panel owns them.',
      '',
      '## How to write',
      '- One line per fact, at most 60 characters; each card at most 600 characters.',
      '- Near the cap, read the card and compress it with `replace` instead of appending forever.',
      '- Say it was remembered only when the tool returns `saved`.',
    ].join('\n'),
  },
]

export function workspaceSkillBody(skill: WorkspaceSkill, language: WorkspaceLanguage): string {
  return language === 'en' ? skill.en : skill.zh
}
