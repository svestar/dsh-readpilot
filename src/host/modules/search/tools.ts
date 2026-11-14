import type { ToolDefinition } from '../../types.ts'
import { SEARCH_OUTPUT_SCHEMA, outputOf } from '../tools/shared.ts'
import type { ReaderToolApi } from '../tools/facade.ts'

export function createSearchTools(api: ReaderToolApi): ToolDefinition[] {
  return [{
    name: 'reader_search',
    description:
      'Search the library or one book for a literal phrase and return snippets with stable locators. Use it to find a passage before reader_read; do not use it to dump whole chapters. The tool result card has a jump button that opens the sidebar reader at the match.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Literal phrase, at least 2 characters.' },
        book: { type: 'string', description: 'Optional book id or title. Omit to search supported books in the library.' },
        limit: { type: 'number', description: 'Maximum matches, default 20, capped at 50.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    output: { schema: SEARCH_OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
    async execute(args) {
      return await api.toolSearch(args ?? {})
    },
  }]
}
