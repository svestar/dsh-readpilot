const enabledByBook = new Map<string, boolean>()

/**
 * Bilingual mode lasts for one mounted reading view. The module-level map keeps
 * it across transient panel unmounts (for example switching to another chat
 * panel and back), while a real book open clears the entry.
 */
export function translationEnabledForBook(bookId: string | null): boolean {
  return bookId ? enabledByBook.get(bookId) === true : false
}

export function rememberTranslationEnabled(bookId: string | null, value: boolean): void {
  if (!bookId) return
  enabledByBook.set(bookId, value)
}

export function forgetTranslationEnabled(bookId: string | null): void {
  if (bookId) enabledByBook.delete(bookId)
}
