import type { ToolDefinition } from '../../types.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { ReaderError } from '../../lib/errors.ts'
import { BOOKS_OUTPUT_SCHEMA, OUTPUT_SCHEMA, outputOf } from '../tools/shared.ts'
import type { ReaderToolApi } from '../tools/facade.ts'

function localized(language: WorkspaceLanguage, zh: string, en: string): string {
  return language === 'en' ? en : zh
}

export function createLibraryTools(api: ReaderToolApi): ToolDefinition[] {
  return [
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
        const language = await api.workspaceLanguage()
        const books = await api.toolBooks()
        const found = (books?.books ?? []).find((book: any) => book.id === args?.book || book.title === args?.book)
        if (!found) {
          throw new ReaderError(
            'book-not-found',
            localized(language, `书库中找不到书籍：${String(args?.book)}`, `Book not found in the library: ${String(args?.book)}`),
          )
        }
        const meta = await api.libraryMeta()
        const previous = meta.tags[found.id] ?? []
        const result = await api.setBookTags({ bookId: found.id, tags: args?.tags })
        const action = await api.pushReaderAction({ type: 'libraryRefresh' })
        await api.recordReaderReceipt({
          type: 'tag.update',
          bookId: found.id,
          bookTitle: found.title,
          summary: localized(language, `修改标签：${found.title}`, `Updated tags: ${found.title}`),
          undo: { kind: 'setTags', bookId: found.id, tags: previous },
        })
        return {
          actionId: action.id,
          queued: true,
          bookId: found.id,
          tags: result.tags,
          message: localized(language, '标签已保存，书库将在 1 秒内刷新。', 'Tags saved; the library will refresh within a second.'),
        }
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
        const language = await api.workspaceLanguage()
        const books = await api.toolBooks()
        const found = (books?.books ?? []).find((book: any) => book.id === args?.book || book.title === args?.book)
        if (!found) {
          throw new ReaderError(
            'book-not-found',
            localized(language, `书库中找不到书籍：${String(args?.book)}`, `Book not found in the library: ${String(args?.book)}`),
          )
        }
        const meta = await api.libraryMeta()
        const previous = meta.status[found.id] ?? null
        const status = args?.status === 'none' ? null : args?.status
        const result = await api.setBookStatus({ bookId: found.id, status })
        const action = await api.pushReaderAction({ type: 'libraryRefresh' })
        await api.recordReaderReceipt({
          type: 'status.update',
          bookId: found.id,
          bookTitle: found.title,
          summary: localized(language, `修改阅读状态：${found.title}`, `Updated reading status: ${found.title}`),
          undo: { kind: 'setStatus', bookId: found.id, status: previous },
        })
        return {
          actionId: action.id,
          queued: true,
          bookId: found.id,
          status: result.status,
          message: localized(language, '阅读状态已保存，书库将在 1 秒内刷新。', 'Reading status saved; the library will refresh within a second.'),
        }
      },
    },
  ]
}
