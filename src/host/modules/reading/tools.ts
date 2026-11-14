import type { ToolDefinition } from '../../types.ts'
import { OUTPUT_SCHEMA, outputOf } from '../tools/shared.ts'
import type { ReaderToolApi } from '../tools/facade.ts'

export function createReadingTools(api: ReaderToolApi): ToolDefinition[] {
  return [
    {
      name: 'reader_open',
      description:
        'Open one book for this conversation and return metadata plus its table of contents. This only loads data for the model; it does not change the reader panel. The tool result card has a jump button that opens the sidebar reader. TOC page values are the reader\'s PDF page numbers, not the book\'s printed page numbers. Use the returned chapter ids with reader_read. The book may be addressed by id or by title.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title from reader_books.' },
        },
        required: ['book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        return await api.toolOpen(args ?? {})
      },
    },
    {
      name: 'reader_digest',
      description:
        'Return an extractive whole-book digest: every chapter title plus selected key excerpts under a character budget. Use it when the user explicitly asks for a whole-book summary or to read the whole book. It is not full text; disclose the extractive coverage and use reader_read for details in specific chapters. Do not loop reader_read over every chapter just to write a whole-book summary.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title from reader_books.' },
          maxChars: { type: 'number', description: 'Total excerpt budget, default 12000, capped at 30000.' },
          perChapterChars: { type: 'number', description: 'Per-chapter excerpt budget, default 600, capped at 2000.' },
        },
        required: ['book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        return await api.toolDigest(args ?? {})
      },
    },
    {
      name: 'reader_context',
      description:
        'Return the current or most recently read book, its chapter progress, TOC, recent notes and recentActions. TOC page values are the reader\'s PDF page numbers, not the book\'s printed page numbers. recentActions includes status "undone_by_user" when the user undid a prior action; check it before assuming an action failed. Call this first when the user says "this book" or asks about what they are reading. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Optional book id or title; omit for the most recently read book.' },
        },
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args, exec) {
        return await api.toolContext({ ...(args ?? {}), sessionId: exec?.agent?.session?.id })
      },
    },
    {
      name: 'reader_read',
      description:
        'Read a bounded passage from one chapter. offset is a 0-based character offset; limit defaults to 4000 and is capped at 8000. Continue with nextOffset while hasMore is true. Quote the locator when citing the passage.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title from reader_books.' },
          chapter: { type: 'string', description: 'Chapter id or exact title from reader_open. Omit for the first chapter.' },
          offset: { type: 'number', description: '0-based character offset inside the chapter text. Defaults to 0.' },
          limit: { type: 'number', description: 'Maximum characters to return. Defaults to 4000, capped at 8000.' },
        },
        required: ['book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        return await api.toolRead(args ?? {})
      },
    },
  ]
}
