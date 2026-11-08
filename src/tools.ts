import type { ReaderApi } from './api.ts'

interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: {
    schema: Record<string, unknown>
    render: (args: unknown, value: unknown) => Array<{ type: string; text: string }>
  }
  execute(args?: any, exec?: any): Promise<unknown>
}

export interface ToolContext {
  tools: { register(definition: ToolDefinition): () => void }
}

const OUTPUT_SCHEMA = { type: 'object', properties: {}, additionalProperties: true }

const BOOKS_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    libraryDir: { type: 'string' },
    books: { type: 'array' },
  },
  additionalProperties: true,
}

const SEARCH_OUTPUT_SCHEMA = {
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

function outputOf(value: unknown): Array<{ type: string; text: string }> {
  return [{ type: 'text', text: JSON.stringify(value) }]
}

/**
 * Normalize a tool result to lossless JSON. DSH rejects a tool call whose value
 * does not survive a JSON round trip: `undefined` fields, non-finite numbers and
 * non-plain objects all fail. Dropping `undefined` matches what the model already
 * sees, because the rendered text is `JSON.stringify(value)`.
 */
export function losslessJson(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return Object.is(value, -0) ? 0 : value
  }
  if (Array.isArray(value)) return value.map(losslessJson)
  if (typeof value === 'object') {
    const plain: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === undefined) continue
      plain[key] = losslessJson(child)
    }
    return plain
  }
  return null
}

export function registerTools(ctx: ToolContext, api: ReaderApi): () => void {
  async function actionTarget(book: unknown, chapter: unknown, page: unknown) {
    const opened = await api.toolOpen({ book })
    const toc: any[] = Array.isArray(opened?.toc) ? opened.toc : []
    let target = typeof chapter === 'string'
      ? toc.find(item => item.id === chapter || item.title === chapter)
      : undefined
    if (!target && typeof page === 'number' && Number.isInteger(page)) {
      target = toc.find(item => item.page === page)
    }
    if (!target && opened?.progress?.chapterId) {
      target = toc.find(item => item.id === opened.progress.chapterId)
    }
    target ??= toc[0]
    if (!target) throw new Error('这本书没有可定位的章节')
    return { opened, target }
  }

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
      output: { schema: BOOKS_OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute() {
        return await api.toolBooks()
      },
    },
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
        'Return the current or most recently read book, its chapter progress, TOC and recent notes. TOC page values are the reader\'s PDF page numbers, not the book\'s printed page numbers. Call this first when the user says "this book" or asks about what they are reading. Read-only.',
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
    {
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
    },
    {
      name: 'reader_note',
      description:
        'Create or list passage-anchored annotations for one book. An annotation is a quote plus optional note text; a highlight is the same annotation with empty note text. Use only when the user selects or quotes a passage and wants a brief annotation; do NOT use it for chapter, topic or whole-book write-ups (use reader_notes for those). For add, pass the book, chapter and quoted passage; blockIndex/offset come from a reader_read locator when available. Color is optional and defaults to yellow.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list'], description: 'add an annotation or list existing annotations and bookmarks.' },
          book: { type: 'string', description: 'Book id or title from reader_books.' },
          chapter: { type: 'string', description: 'Chapter id or title; required for add.' },
          blockIndex: { type: 'number', description: '0-based block index inside the chapter.' },
          offset: { type: 'number', description: '0-based character offset inside the chapter text.' },
          quote: { type: 'string', description: 'The quoted passage being annotated.' },
          note: { type: 'string', description: 'Annotation text; leave empty to create a highlight.' },
          color: { type: 'string', enum: ['yellow', 'green', 'blue', 'pink', 'purple'], description: 'Annotation color; defaults to yellow.' },
        },
        required: ['action', 'book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        return await api.toolNote(args ?? {})
      },
    },
    {
      name: 'reader_goto',
      description:
        'Move the reader to a book chapter, PDF page or character offset. The action is queued for the mounted reader and returns a receipt; it does not change the main reader to a different book (that opens the sidebar reader).',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title.' },
          chapter: { type: 'string', description: 'Chapter id or title; optional when page or progress is available.' },
          page: { type: 'number', description: 'PDF page number; used when chapter is omitted.' },
          offset: { type: 'number', description: '0-based character offset inside the chapter.' },
        },
        required: ['book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        const { opened, target } = await actionTarget(args?.book, args?.chapter, args?.page)
        const offset = Number.isInteger(args?.offset) && args.offset >= 0 ? args.offset : undefined
        const action = await api.pushReaderAction({
          type: 'goto',
          bookId: opened.bookId,
          bookTitle: opened.title,
          chapterId: target.id,
          ...(offset === undefined ? {} : { offset }),
        })
        return {
          actionId: action.id,
          queued: true,
          bookId: opened.bookId,
          bookTitle: opened.title,
          chapterId: target.id,
          chapterTitle: target.title,
          offset: offset ?? null,
          message: '跳转已排队，阅读器会在 1 秒内响应。',
        }
      },
    },
    {
      name: 'reader_open_panel',
      description:
        'Open a book/chapter in the reading panel. The action is queued for the mounted reader and returns a receipt; it opens the sidebar reader when the main reader is on another book.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title.' },
          chapter: { type: 'string', description: 'Chapter id or title; defaults to progress or first chapter.' },
          page: { type: 'number', description: 'PDF page number; used when chapter is omitted.' },
          offset: { type: 'number', description: '0-based character offset inside the chapter.' },
        },
        required: ['book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        const { opened, target } = await actionTarget(args?.book, args?.chapter, args?.page)
        const offset = Number.isInteger(args?.offset) && args.offset >= 0 ? args.offset : undefined
        const action = await api.pushReaderAction({
          type: 'open_panel',
          bookId: opened.bookId,
          bookTitle: opened.title,
          chapterId: target.id,
          ...(offset === undefined ? {} : { offset }),
        })
        return {
          actionId: action.id,
          queued: true,
          bookId: opened.bookId,
          bookTitle: opened.title,
          chapterId: target.id,
          chapterTitle: target.title,
          message: '打开阅读面板已排队。',
        }
      },
    },
    {
      name: 'reader_mark',
      description:
        'Create a passage annotation and queue a reader refresh. A highlight is an annotation with empty note; color is optional. Returns the saved note and action receipt.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title.' },
          chapter: { type: 'string', description: 'Chapter id or title.' },
          quote: { type: 'string', description: 'Quoted passage.' },
          note: { type: 'string', description: 'Annotation text; empty creates a highlight.' },
          color: { type: 'string', enum: ['yellow', 'green', 'blue', 'pink', 'purple'], description: 'Annotation color.' },
          blockIndex: { type: 'number', description: '0-based block index.' },
          offset: { type: 'number', description: '0-based character offset.' },
        },
        required: ['book', 'chapter', 'quote'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        const result = await api.toolNote({ action: 'add', ...args })
        const action = await api.pushReaderAction({ type: 'notesRefresh', bookId: result.bookId })
        return {
          actionId: action.id,
          queued: true,
          bookId: result.bookId,
          bookTitle: result.bookTitle,
          chapterId: result.chapterId,
          chapterTitle: result.chapterTitle,
          note: result.note,
          message: '批注已保存，阅读器会在 1 秒内刷新。',
        }
      },
    },
    {
      name: 'reader_tag',
      description:
        'Replace a book\'s tags and queue a library refresh. Returns the normalized tags and action receipt.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title.' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Complete replacement tag list.' },
        },
        required: ['book', 'tags'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        const books = await api.toolBooks()
        const found = (books?.books ?? []).find((book: any) => book.id === args?.book || book.title === args?.book)
        if (!found) throw new Error(`书库中找不到书籍：${String(args?.book)}`)
        const result = await api.setBookTags({ bookId: found.id, tags: args?.tags })
        const action = await api.pushReaderAction({ type: 'libraryRefresh' })
        return { actionId: action.id, queued: true, bookId: found.id, tags: result.tags, message: '标签已保存，书库将在 1 秒内刷新。' }
      },
    },
    {
      name: 'reader_status',
      description:
        'Set a book reading status (want/reading/done/none) and queue a library refresh. Returns the normalized status and action receipt.',
      parameters: {
        type: 'object',
        properties: {
          book: { type: 'string', description: 'Book id or title.' },
          status: { type: 'string', enum: ['want', 'reading', 'done', 'none'], description: 'Reading status; none clears it.' },
        },
        required: ['book', 'status'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        const books = await api.toolBooks()
        const found = (books?.books ?? []).find((book: any) => book.id === args?.book || book.title === args?.book)
        if (!found) throw new Error(`书库中找不到书籍：${String(args?.book)}`)
        const status = args?.status === 'none' ? null : args?.status
        const result = await api.setBookStatus({ bookId: found.id, status })
        const action = await api.pushReaderAction({ type: 'libraryRefresh' })
        return { actionId: action.id, queued: true, bookId: found.id, status: result.status, message: '阅读状态已保存，书库将在 1 秒内刷新。' }
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
        throw new Error(`未知操作：${String(action)}`)
      },
    },
    {
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
    },
  ]

  const disposers = definitions.map(definition => ctx.tools.register({
    ...definition,
    async execute(args?: any, exec?: any) {
      return losslessJson(await definition.execute(args, exec))
    },
  }))
  return () => {
    for (const dispose of disposers) dispose()
  }
}