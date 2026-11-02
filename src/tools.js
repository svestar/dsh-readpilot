const OUTPUT_SCHEMA = { type: 'object', properties: {}, additionalProperties: true }

function outputOf(value) {
  return [{ type: 'text', text: JSON.stringify(value) }]
}

function jsonError(error) {
  return { error: error instanceof Error ? error.message : String(error) }
}

export function registerTools(ctx, api) {
  const definitions = [
    {
      name: 'reader_books',
      description:
        'List the configured ebook library and each book\'s reading progress. Call this first to find a book id or title before reader_open or reader_read.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute() {
        try {
          return await api.toolBooks()
        } catch (error) {
          return jsonError(error)
        }
      },
    },
    {
      name: 'reader_open',
      description:
        'Open one book and return metadata plus its table of contents. Use the returned chapter ids with reader_read. The book may be addressed by id or by title.',
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
        try {
          return await api.toolOpen(args ?? {})
        } catch (error) {
          return jsonError(error)
        }
      },
    },
    {
      name: 'reader_context',
      description:
        'Return the current or most recently read book, its chapter progress, TOC and recent notes. Call this first when the user says "this book" or asks about what they are reading. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Optional book id or title; omit for the most recently read book.' },
        },
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        try {
          return await api.toolContext(args ?? {})
        } catch (error) {
          return jsonError(error)
        }
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
        try {
          return await api.toolRead(args ?? {})
        } catch (error) {
          return jsonError(error)
        }
      },
    },
    {
      name: 'reader_search',
      description:
        'Search the library or one book for a literal phrase and return snippets with stable locators. Use it to find a passage before reader_read; do not use it to dump whole chapters.',
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
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        try {
          return await api.toolSearch(args ?? {})
        } catch (error) {
          return jsonError(error)
        }
      },
    },
    {
      name: 'reader_note',
      description:
        'Create or list notes for one book. For add, pass the book, chapter, quoted passage, and note text; blockIndex/offset come from a reader_read locator when available. Notes are stored per book under the reader data directory.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list'], description: 'add a note or list existing notes.' },
          book: { type: 'string', description: 'Book id or title from reader_books.' },
          chapter: { type: 'string', description: 'Chapter id or title; required for add.' },
          blockIndex: { type: 'number', description: '0-based block index inside the chapter.' },
          offset: { type: 'number', description: '0-based character offset inside the chapter text.' },
          quote: { type: 'string', description: 'The quoted passage being annotated.' },
          note: { type: 'string', description: 'The note text to save.' },
        },
        required: ['action', 'book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        try {
          return await api.toolNote(args ?? {})
        } catch (error) {
          return jsonError(error)
        }
      },
    },
  ]

  const disposers = definitions.map(definition => ctx.tools.register(definition))
  return () => {
    for (const dispose of disposers) dispose()
  }
}
