export function companionSessionTitle(bookTitle: unknown): string {
  const title = typeof bookTitle === 'string' ? bookTitle.trim() : ''
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
export async function syncCompanionSessionTitles(
  runtime: any,
  books: readonly { id: string; title?: string }[],
  sessions: Record<string, { sessionId?: string } | undefined>,
): Promise<void> {
  for (const [bookId, entry] of Object.entries(sessions ?? {})) {
    if (!entry?.sessionId) continue
    const book = books.find(candidate => candidate.id === bookId)
    if (!book) continue
    await renameCompanionSession(runtime, entry.sessionId, companionSessionTitle(book.title)).catch(() => {})
  }
}
