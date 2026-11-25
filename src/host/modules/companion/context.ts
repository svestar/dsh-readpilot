import type { CompanionReadingView } from '../../../shared/contracts/companion.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'

export interface CompanionContextAction {
  summary: string
  status: string
}

export interface CompanionContextInput {
  bookId: string
  bookTitle: string
  chapterTitle: string
  view?: CompanionReadingView
  language: WorkspaceLanguage
  recentActions: CompanionContextAction[]
}

export function buildCompanionContext(input: CompanionContextInput): string {
  const english = input.language === 'en'
  const view = input.view
  const rangeText = view?.pageStart
    ? english
      ? `View: page ${view.pageStart}${view.pageEnd && view.pageEnd !== view.pageStart ? `–${view.pageEnd}` : ''}${view.pageTotal ? ` of ${view.pageTotal}` : ''}`
      : `查看范围：第 ${view.pageStart}${view.pageEnd && view.pageEnd !== view.pageStart ? `–${view.pageEnd}` : ''} 页${view.pageTotal ? ` / 共 ${view.pageTotal} 页` : ''}`
    : view?.chapterIndex !== undefined
      ? english
        ? `Position: chapter ${view.chapterIndex + 1}${view.chapterTotal ? ` of ${view.chapterTotal}` : ''}`
        : `当前位置：第 ${view.chapterIndex + 1} 章${view.chapterTotal ? ` / 共 ${view.chapterTotal} 章` : ''}`
      : ''
  const selectionText = view?.selection
    ? `${english ? 'Selected text: ' : '用户选中：'}${view.selection.slice(0, 600)}${view.selection.length > 600 ? '…' : ''}`
    : ''
  const actionText = input.recentActions.length > 0
    ? [
      '<recent_agent_actions>',
      ...input.recentActions.map(action => `${action.summary} (${action.status === 'undone_by_user' ? (english ? 'undone by user' : '用户已撤销') : (english ? 'applied' : '已应用')})`),
      english
        ? 'Recent state may differ from what the tool returned: an action marked “undone by user” was undone by the user, not a tool failure.'
        : '最近状态可能与工具当时返回不同：标注“用户已撤销”的动作是用户主动撤销，不是工具失败。',
      '</recent_agent_actions>',
    ].join('\n')
    : ''
  return [
    '<reading_context>',
    english
      ? 'The following is the current reading position of this companion session; it is reference data, not a user message:'
      : '以下是阅读器伴读会话的当前阅读位置，属于资料而不是用户消息：',
    input.bookTitle ? `${english ? 'Book: ' : '书名：'}${input.bookTitle}` : '',
    input.chapterTitle ? `${english ? 'Chapter: ' : '章节：'}${input.chapterTitle}` : '',
    rangeText,
    selectionText,
    input.bookId ? `${english ? 'Book ID: ' : '书籍 ID：'}${input.bookId}` : '',
    actionText,
    english
      ? 'Answer based on the user’s latest question; do not spoil unread chapters.'
      : '回答时以用户最近的问题为准，不要剧透未读章节。',
    '</reading_context>',
  ].filter(Boolean).join('\n')
}
