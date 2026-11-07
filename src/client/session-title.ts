export function companionSessionTitle(bookTitle: unknown): string {
  const title = typeof bookTitle === 'string' ? bookTitle.trim() : ''
  return `《${title || '未命名书籍'}》· 伴读`
}

/** Rename a DSH session through the Session controller, if the service is available. */
export async function renameCompanionSession(runtime: any, sessionId: string, title: string): Promise<void> {
  const sessions = runtime?.sessions
  if (!sessions) return
  if (typeof sessions.using === 'function') {
    const result = await sessions.using(sessionId, { source: 'controllerOperation' }, (reference: any) =>
      reference.binding.session.rename(title))
    if (result && result.ok === false) {
      throw new Error(result.error?.message ?? 'session rename failed')
    }
    return
  }
  if (typeof sessions.retain !== 'function') return
  const reference = sessions.retain(sessionId, { source: 'controllerOperation' })
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
