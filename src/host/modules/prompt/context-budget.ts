/** Shared character budgets for the per-session reader context blocks. */
export const CONTEXT_BUDGET = {
  role: 1200,
  reading: 2600,
  memory: 3000,
  notesIndex: 3000,
  highlights: 2000,
  total: 12000,
} as const

export interface ReaderContextBlocks {
  reading: string
  memory: string
  notes: string
}

/** Keep a context block under a hard limit while preserving its closing tag. */
export function fitText(text: string, limit: number, closeTag: string): string {
  if (text.length <= limit) return text
  const room = limit - closeTag.length - 2
  if (room <= 0) return ''
  return `${text.slice(0, room).trimEnd()}…\n${closeTag}`
}

/** Assemble the per-session blocks with reading > memory > notes priority. */
export function assembleReaderContexts(
  blocks: ReaderContextBlocks,
  maxTotal: number = CONTEXT_BUDGET.total,
): string {
  const entries = [
    { text: blocks.reading.trim(), closeTag: '</reading_context>' },
    { text: blocks.memory.trim(), closeTag: '</reading_memory>' },
    { text: blocks.notes.trim(), closeTag: '</reading_notes>' },
  ]
  const parts: string[] = []
  let remaining = maxTotal
  for (const entry of entries) {
    if (!entry.text || remaining <= 0) continue
    const separator = parts.length > 0 ? 2 : 0
    const limit = remaining - separator
    if (limit <= 0) break
    const fitted = fitText(entry.text, limit, entry.closeTag)
    if (!fitted) continue
    parts.push(fitted)
    remaining -= fitted.length + separator
  }
  return parts.join('\n\n')
}
