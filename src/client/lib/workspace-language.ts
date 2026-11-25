import type { WorkspaceLanguage } from '../../shared/contracts/library.ts'

/** Read DSH's active UI locale once, when a library workspace is initialized. */
export function workspaceLanguageFromRuntime(runtime: any): WorkspaceLanguage {
  const active = runtime?.locale?.getSnapshot?.().active
  if (active == null) return 'zh'
  return active === 'zh' ? 'zh' : 'en'
}
