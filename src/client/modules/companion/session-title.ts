import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'

export function companionSessionTitle(bookTitle: unknown, language: WorkspaceLanguage = 'zh'): string {
  const title = typeof bookTitle === 'string' ? bookTitle.trim() : ''
  if (language === 'en') return `${title || 'Untitled book'} · Companion`
  return `《${title || '未命名书籍'}》· 伴读`
}

/** Rename a DSH session through the Session controller, if the service is available. */
export async function renameCompanionSession(runtime: any, sessionId: string, title: string): Promise<void> {
  const sessions = runtime?.sessions
  if (!sessions) return
  if (typeof sessions.using === 'function') {
    const result = await sessions.using(sessionId, { source: 'workspaceOperation' }, (reference: any) =>
      reference.binding.session.rename(title))
    if (result && result.ok === false) {
      throw new Error(result.error?.message ?? 'session rename failed')
    }
    return
  }
  if (typeof sessions.retain !== 'function') return
  const reference = sessions.retain(sessionId, { source: 'workspaceOperation' })
  try {
    if (reference?.ready) await reference.ready
    const result = await reference?.binding?.session?.rename(title)
    if (result && result.ok === false) {
      throw new Error(result.error?.message ?? 'session rename failed')
    }
  } finally {
    try {
      reference?.release?.()
    } catch {
      // The session may already be released.
    }
  }
}
