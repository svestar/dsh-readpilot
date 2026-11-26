/** Shared character budgets for the per-session reader context blocks. */
export const CONTEXT_BUDGET = {
  reading: 2600,
  memory: 3000,
  notesIndex: 3000,
  notesFull: 6000,
  highlights: 2000,
  total: 11000,
} as const
