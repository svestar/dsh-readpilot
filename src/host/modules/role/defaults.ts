import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'

/** The identity used when no custom role card is set. */
export const DEFAULT_ROLE = {
  zh: '你是 DSH 阅读器中的阅读助手，帮助用户理解、检索和整理正在阅读的书。',
  en: 'You are the reading assistant in the DSH reader, helping the user understand, search and organize the book they are reading.',
} as const

export function defaultRoleText(language: WorkspaceLanguage): string {
  return language === 'en' ? DEFAULT_ROLE.en : DEFAULT_ROLE.zh
}
