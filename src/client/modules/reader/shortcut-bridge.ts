export type ReaderShortcutAction = 'search' | 'bookmark'

/** Commands the Host registered; the panel only handles keys the Host did not. */
export const hostShortcutActions = new Set<ReaderShortcutAction>()

export let readerShortcutBridge: { search: () => void; bookmark: () => void } | null = null

export function setReaderShortcutBridge(value: { search: () => void; bookmark: () => void } | null): void {
  readerShortcutBridge = value
}
