import type { LongNote } from '../../lib/types.ts'

export interface ActiveNote {
  note: LongNote
  body: string
  hash: string
}

/**
 * Applying a draft must not open or switch the note preview by itself: keep the
 * preview unchanged unless it already shows the very note that was applied.
 */
export function nextActiveOnApply(current: ActiveNote | null, applied: ActiveNote): ActiveNote | null {
  if (!current || current.note.id !== applied.note.id) return current
  return { note: applied.note, body: applied.body, hash: applied.hash }
}
