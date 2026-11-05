export interface AnswerMessage {
  role: string
  text: string
}

export interface AnswerNoteAnchor {
  quote: string
  chapterId: string
  blockIndex: number
  offset: number
}

export interface AnswerNotePayload {
  quote: string
  note: string
  chapterId: string
  blockIndex: number
  offset: number
}

/** Last non-empty assistant answer in the transcript, or an empty string. */
export function lastAssistantText(messages: readonly AnswerMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== 'assistant') continue
    const text = message.text.trim()
    if (text) return text
  }
  return ''
}

/** Build the short-note payload for an answer anchored to a quoted passage. */
export function buildAnswerNote(anchor: AnswerNoteAnchor | null | undefined, answer: string): AnswerNotePayload | null {
  if (!anchor) return null
  const quote = anchor.quote.trim()
  const note = answer.trim()
  if (!quote || !note || !anchor.chapterId) return null
  return {
    quote,
    note,
    chapterId: anchor.chapterId,
    blockIndex: Number.isInteger(anchor.blockIndex) && anchor.blockIndex >= 0 ? anchor.blockIndex : 0,
    offset: Number.isInteger(anchor.offset) && anchor.offset >= 0 ? anchor.offset : 0,
  }
}
