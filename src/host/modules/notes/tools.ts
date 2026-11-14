import type { ToolDefinition } from '../../types.ts'
import { OUTPUT_SCHEMA, outputOf } from '../tools/shared.ts'
import type { ReaderToolApi } from '../tools/facade.ts'

export function createNotesTools(api: ReaderToolApi): ToolDefinition[] {
  return [
    {
      name: 'reader_note',
      description:
        'Create, list, rewrite or delete passage-anchored annotations for one book. An annotation is a quote plus optional note text; a highlight is the same annotation with empty note text. Use only when the user selects or quotes a passage and wants a brief annotation; do NOT use it for chapter, topic or whole-book write-ups (use reader_notes for those). For add, pass the book, chapter and quoted passage; blockIndex/offset come from a reader_read locator when available. update/delete operate on noteId returned by add or list; only do them when the user explicitly asks to rewrite or delete that annotation. list also returns recentActions; status "undone_by_user" means the user undid an action and it did not fail. Color is optional and defaults to yellow.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list', 'update', 'delete'], description: 'add/list/update/delete an annotation or bookmark.' },
          book: { type: 'string', description: 'Book id or title from reader_books.' },
          chapter: { type: 'string', description: 'Chapter id or title; required for add.' },
          noteId: { type: 'string', description: 'Note id for update or delete.' },
          blockIndex: { type: 'number', description: '0-based block index inside the chapter.' },
          offset: { type: 'number', description: '0-based character offset inside the chapter text.' },
          quote: { type: 'string', description: 'The quoted passage being annotated.' },
          note: { type: 'string', description: 'Annotation text; empty creates a highlight.' },
          color: { type: 'string', enum: ['yellow', 'green', 'blue', 'pink', 'purple'], description: 'Annotation color; defaults to yellow.' },
        },
        required: ['action', 'book'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (_args, value) => outputOf(value) },
      async execute(args) {
        const result = await api.toolNote(args ?? {})
        if (args?.action === 'list') return result
        const action = await api.pushReaderAction({ type: 'notesRefresh', bookId: result.bookId })
        return {
          ...result,
          actionId: action.id,
          queued: true,
          message: args?.action === 'delete'
            ? '批注已删除，阅读器会在 1 秒内刷新。'
            : args?.action === 'update'
              ? '批注已更新，阅读器会在 1 秒内刷新。'
              : '批注已保存，阅读器会在 1 秒内刷新。',
        }
      },
    },
    {
      name: 'reader_notes',
      description:
        'Read LONG-FORM markdown notes (chapter, topic or whole-book documents) for one book, create a pending draft, or delete one when the user explicitly asks. Use it when the user asks to organize, write, append, expand, rewrite or delete a long note or document. index/read are read-only. create/write/append never save directly: they create a draft the user must review and apply in the Notes tab. delete removes the note file immediately; only do it on explicit request. Use write actions only when the user explicitly asks to write or edit a long note; never claim it was saved.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['index', 'read', 'create', 'write', 'append', 'delete'],
            description: 'index/read read notes; create/write/append create a pending draft; delete removes an existing long note.',
          },
          book: { type: 'string', description: 'Book id or title from reader_books or reader_context.' },
          id: { type: 'string', description: 'Note id for read, write, append or delete.' },
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
        if (action === 'delete') {
          const content = await api.toolNoteFiles({ action: 'read', book: args?.book, id: args?.id })
          const result = await api.toolNoteFiles({ ...args, action: 'remove' })
          if (result.deleted) {
            await api.recordReaderReceipt({
              type: 'longNote.delete',
              bookId: result.bookId,
              bookTitle: result.bookTitle,
              summary: `删除长笔记：${content.note.title}`,
              undo: { kind: 'restoreNoteFile', bookId: result.bookId, note: content.note, body: content.body },
            })
          }
          return result
        }
        if (action === 'create' || action === 'write' || action === 'append') {
          const previous = (action === 'write' || action === 'append') && args?.id
            ? await api.toolNoteFiles({ action: 'read', book: args?.book, id: args?.id }).catch(() => null)
            : null
          const result = await api.noteDraftCreate(args ?? {})
          if (result.autoApplied && result.note?.id) {
            await api.recordReaderReceipt({
              type: 'longNote.write',
              bookId: result.draft.bookId,
              bookTitle: result.note.title,
              summary: `自动应用长笔记：${result.note.title}`,
              undo: previous
                ? { kind: 'restoreNoteFile', bookId: result.draft.bookId, note: previous.note, body: previous.body }
                : { kind: 'deleteNoteFile', bookId: result.draft.bookId, noteId: result.note.id },
            })
          }
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
  ]
}
