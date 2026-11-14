import type { ToolDefinition } from '../../types.ts'
import { OUTPUT_SCHEMA, outputOf } from '../tools/shared.ts'
import type { ReaderToolApi } from '../tools/facade.ts'

export function createMemoryTools(api: ReaderToolApi): ToolDefinition[] {
  return [{
    name: 'reader_memory',
    description:
      'Read or update reading memory for one book. Memory is opt-in and off by default; update/forget only work when memory is on for this book. When on, proactively record only durable reader facts: stable preferences, views on the book or author, recurring questions and goals. Never store plot facts, one-off questions or reading progress. Write one short line per fact (at most 60 characters); each card is capped at 600 characters, so read it back and compress with mode=replace instead of appending forever. Never claim memory was saved until the result says saved.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'update', 'forget'],
          description: 'read memory cards, update one card, or forget one card.',
        },
        book: { type: 'string', description: 'Book id or title from reader_books or reader_context.' },
        scope: { type: 'string', enum: ['book', 'reader'], description: 'book memory or the cross-book reader card; defaults to book.' },
        mode: {
          type: 'string',
          enum: ['append', 'replace'],
          description: 'append to the card or replace it; defaults to append.',
        },
        text: { type: 'string', description: 'Memory text for update.' },
      },
      required: ['action', 'book'],
      additionalProperties: false,
    },
    output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
    async execute(args) {
      return await api.memoryTool(args ?? {})
    },
  }]
}
