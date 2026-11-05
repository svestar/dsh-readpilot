export type ReaderShortcutAction = 'next' | 'prev' | 'search' | 'close-search' | 'clear-selection' | 'bookmark'

export interface ShortcutKey {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  isComposing?: boolean
  targetTag?: string
  contentEditable?: boolean
}

export interface ShortcutContext {
  searchOpen: boolean
  hasSelection: boolean
  paged: boolean
}

/**
 * Map a key event to a reader action. Returns null when the reader should not
 * handle the key: typing targets, modifier combinations and scroll mode.
 */
export function readerShortcut(input: ShortcutKey, context: ShortcutContext): ReaderShortcutAction | null {
  const tag = (input.targetTag ?? '').toUpperCase()
  if (input.contentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return null
  if (input.isComposing || input.altKey) return null
  const key = input.key
  if ((input.ctrlKey || input.metaKey) && key.toLowerCase() === 'f') return 'search'
  if (input.ctrlKey || input.metaKey) return null
  if (key === 'Escape') {
    if (context.searchOpen) return 'close-search'
    return context.hasSelection ? 'clear-selection' : null
  }
  if (key === 'f' || key === 'F') return 'search'
  if (key === 'b' || key === 'B') return 'bookmark'
  const forward = key === 'ArrowRight' || key === 'PageDown' || key === ' '
  const backward = key === 'ArrowLeft' || key === 'PageUp'
  if (!forward && !backward) return null
  if (!context.paged) return null
  return forward ? 'next' : 'prev'
}
