export function renderPrompt(template: string, values: {
  selection: string
  book: string
  chapter: string
  notes: string
}): string {
  return template
    .replace(/\{\{selection\}\}/g, () => values.selection)
    .replace(/\{\{book\}\}/g, () => values.book)
    .replace(/\{\{chapter\}\}/g, () => values.chapter)
    .replace(/\{\{notes\}\}/g, () => values.notes)
}
