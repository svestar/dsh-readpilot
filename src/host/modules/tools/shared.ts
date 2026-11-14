export const OUTPUT_SCHEMA = { type: 'object', properties: {}, additionalProperties: true }

export const BOOKS_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    libraryDir: { type: 'string' },
    books: { type: 'array' },
  },
  additionalProperties: true,
}

export const SEARCH_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    matches: { type: 'array' },
    truncated: { type: 'boolean' },
    query: { type: 'string' },
    booksScanned: { type: 'number' },
    booksTotal: { type: 'number' },
    unreadable: { type: 'boolean' },
  },
  additionalProperties: true,
}

export function outputOf(value: unknown): Array<{ type: string; text: string }> {
  return [{ type: 'text', text: JSON.stringify(value) }]
}
