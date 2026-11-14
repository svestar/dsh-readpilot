export interface MainReaderNavigation {
  bookId: string
  jump: (target: { bookId: string; chapterId: string; offset?: number }) => void
}

/** The mounted main panel, so jump links can scroll it instead of opening a tab. */
export let mainReaderNavigation: MainReaderNavigation | null = null

export function setMainReaderNavigation(value: MainReaderNavigation | null): void {
  mainReaderNavigation = value
}
