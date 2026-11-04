import type { ReaderApi } from './api.ts'

interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: {
    schema: { type: string; properties: Record<string, unknown>; additionalProperties: boolean }
    render: (args: unknown, value: unknown) => Array<{ type: string; text: string }>
  }
  execute(args?: any): Promise<unknown>
}

export interface ToolContext {
  tools: { register(definition: ToolDefinition): () => void }
}

const OUTPUT_SCHEMA = { type: 'object', properties: {}, additionalProperties: true }

function outputOf(value: unknown): Array<{ type: string; text: string }> {
  return [{ type: 'text', text: JSON.stringify(value) }]
}

function jsonError(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : String(error) }
}

export function registerTools(ctx: ToolContext, api: ReaderApi): () => void {
  const definitions: ToolDefinition[] = [
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
        'Open one book and return metadata plus its table of contents. TOC page values are the reader\'s PDF page numbers, not the book\'s printed page numbers. Use the returned chapter ids with reader_read. The book may be addressed by id or by title.',
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
        'Return the current or most recently read book, its chapter progress, TOC and recent notes. TOC page values are the reader\'s PDF page numbers, not the book\'s printed page numbers. Call this first when the user says "this book" or asks about what they are reading. Read-only.',
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
        'Create or list SHORT, passage-anchored notes (a sentence or two attached to a quote) for one book. Use only when the user selects or quotes a passage and wants a brief note or annotation; do NOT use it for chapter, topic or whole-book write-ups (use reader_notes for those). For add, pass the book, chapter, quoted passage, and note text; blockIndex/offset come from a reader_read locator when available. Short notes are stored per book under the reader data directory.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list'], description: 'add a short note or list existing short notes.' },
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
    {
      name: 'reader_notes',
      description:
        'Read LONG-FORM markdown notes (chapter, topic or whole-book documents) for one book, or create a pending draft. Use it when the user asks to organize, write, append, expand or rewrite a long note or document. index/read are read-only. create/write/append never save: they create a draft the user must review and apply in the Notes tab. Use write actions only when the user explicitly asks to write or edit a long note; never claim it was saved.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['index', 'read', 'create', 'write', 'append'],
            description: 'index/read read notes; create/write/append create a pending draft.',
          },
          book: { type: 'string', description: 'Book id or title from reader_books or reader_context.' },
          id: { type: 'string', description: 'Note id for read, write or append.' },
          title: { type: 'string', description: 'Note title for create or rename.' },
          kind: { type: 'string', enum: ['book', 'topic'], description: 'create only; defaults to topic.' },
          body: { type: 'string', description: 'Full markdown body for create or write.' },
          text: { type: 'string', description: 'Text to append for append.' },
        },
        required: ['action', 'book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        try {
          const action = args?.action
          if (action === 'index' || action === 'read') return await api.toolNoteFiles(args ?? {})
          if (action === 'create' || action === 'write' || action === 'append') {
            const result = await api.noteDraftCreate(args ?? {})
            return {
              draft: {
                id: result.draft.id,
                action: result.draft.action,
                title: result.draft.title,
                noteId: result.draft.noteId ?? null,
                characters: result.draft.body.length,
              },
              applied: result.autoApplied === true,
              note: result.note ?? null,
              error: result.error,
              message: result.autoApplied
                ? '笔记已自动应用。'
                : result.error
                  ? `草稿已创建，但自动应用失败：${result.error}。请在长笔记页确认。`
                  : '草稿已创建，等待用户在笔记面板确认。',
            }
          }
          return { error: `未知操作：${String(action)}` }
        } catch (error) {
          return jsonError(error)
        }
      },
    },
    {
      name: 'reader_memory',
      description:
        'Read or update reading memory for one book. update/forget only take effect when memory is on for this book; when the global mode asks for consent, update creates a pending proposal the user must approve in the Notes tab. Use memory only for stable reader preferences, opinions and the reading relationship, never for book plot facts. Never claim memory was saved until the result says saved.',
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
        try {
          return await api.memoryTool(args ?? {})
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