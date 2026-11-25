import type { ToolDefinition } from '../../types.ts'
import type { WorkspaceLanguage } from '../../../shared/contracts/library.ts'
import { ReaderError } from '../../lib/errors.ts'
import { OUTPUT_SCHEMA, outputOf } from '../tools/shared.ts'
import type { ReaderToolApi } from '../tools/facade.ts'

function localized(language: WorkspaceLanguage, zh: string, en: string): string {
  return language === 'en' ? en : zh
}

export function createActionTools(api: ReaderToolApi): ToolDefinition[] {
  async function actionTarget(book: unknown, chapter: unknown, page: unknown, language: WorkspaceLanguage) {
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
    if (!target) {
      throw new ReaderError(
        'chapter-not-found',
        localized(language, '这本书没有可定位的章节', 'This book has no locatable chapter'),
      )
    }
    return { opened, target }
  }

  return [
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
        const language = await api.workspaceLanguage()
        const { opened, target } = await actionTarget(args?.book, args?.chapter, args?.page, language)
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
          message: localized(language, '跳转已排队，阅读器会在 1 秒内响应。', 'Jump queued; the reader will respond within a second.'),
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
        const language = await api.workspaceLanguage()
        const { opened, target } = await actionTarget(args?.book, args?.chapter, args?.page, language)
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
          message: localized(language, '打开阅读面板已排队。', 'Open reader panel queued.'),
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
        const language = await api.workspaceLanguage()
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
          message: localized(language, '批注已保存，阅读器会在 1 秒内刷新。', 'Annotation saved; the reader will refresh within a second.'),
        }
      },
    },
  ]
}
