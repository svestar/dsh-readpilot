import type { Book } from '../library/book.ts'
import type { NoteFileStore } from './files/index.ts'
import { NoteFileError } from './files/index.ts'
import { ReaderError } from '../../lib/errors.ts'

interface FavoriteTurn {
  question: string
  answer: string
  time: number
}

interface FavoriteHandlerOptions {
  ctx?: any
  sessionBook(sessionId: string): Promise<{ bookId: string; title: string } | null>
  resolveBook(bookId: string): Promise<Book>
  store(): Promise<NoteFileStore>
  refreshNotes(bookId: string): Promise<void>
}

function textOfContent(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block: any) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block: any) => block.text)
    .join('\n\n')
    .trim()
}

function isHumanMessage(event: any): boolean {
  return event?.type === 'user/message' && event?.data?.source?.kind === 'user'
}

/** Pair the finalized assistant message with the user input of the same turn. */
export function findFavoriteTurn(events: readonly any[], messageId: string): FavoriteTurn {
  let index = -1
  for (let cursor = 0; cursor < events.length; cursor += 1) {
    const event = events[cursor]
    if (event?.type === 'assistant/message' && event?.data?.message?.id === messageId) {
      index = cursor
      break
    }
  }
  if (index < 0) throw new ReaderError('message-not-found', '这条回答已不在当前会话中')
  const event = events[index]
  const answer = textOfContent(event?.data?.message?.content)
  if (!answer) throw new ReaderError('favorite-empty', '这条回答没有可收藏的文本')
  const turn = typeof event?.data?.turn === 'number' ? event.data.turn : undefined
  let start = 0
  let foundStart = false
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = events[cursor]
    if (turn !== undefined && candidate?.type === 'turn/start' && candidate?.data?.turn === turn) {
      start = cursor
      foundStart = true
      break
    }
  }
  if (!foundStart) {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (isHumanMessage(events[cursor])) {
        start = cursor
        break
      }
    }
  }
  let question = ''
  const questions: string[] = []
  for (let cursor = start; cursor < index; cursor += 1) {
    if (!isHumanMessage(events[cursor])) continue
    const text = textOfContent(events[cursor]?.data?.content)
    if (text) questions.push(text)
  }
  question = questions.join('\n\n')
  if (!question) {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (isHumanMessage(events[cursor])) {
        question = textOfContent(events[cursor]?.data?.content)
        break
      }
    }
  }
  return { question, answer, time: typeof event?.time === 'number' ? event.time : Date.now() }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function stampOf(time: number): { title: string; label: string } {
  const date = new Date(time)
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return {
    title: `对话收藏 ${day} ${clock.replace(':', '-')}`,
    label: `${day} ${clock}`,
  }
}

export function renderFavoriteTitle(time: number): string {
  return stampOf(time).title
}

/** One topic note: provenance, question and the assistant answer as markdown. */
export function renderFavoriteNote(input: {
  bookTitle: string
  question: string
  answer: string
  time: number
}): { title: string; body: string } {
  const stamp = stampOf(input.time)
  const lines = [`> 收藏自《${input.bookTitle}》伴读对话 · ${stamp.label}`]
  if (input.question) lines.push('## 我的问题', '', input.question)
  lines.push('## 伴读回答', '', input.answer)
  return { title: stamp.title, body: lines.join('\n\n') }
}

export function createFavoriteHandler(options: FavoriteHandlerOptions) {
  async function favoriteConversation(payload: any = {}): Promise<any> {
    const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : ''
    const messageId = typeof payload.messageId === 'string' ? payload.messageId : ''
    if (!sessionId || sessionId.length > 160) throw new ReaderError('invalid-session', '会话 ID 无效')
    if (!messageId || messageId.length > 160) throw new ReaderError('invalid-message', '消息 ID 无效')
    const query = options.ctx?.get?.('sessionQuery')
    if (!query || typeof query.readSession !== 'function') {
      throw new ReaderError('favorite-unavailable', '当前宿主不支持读取会话内容')
    }
    const binding = await options.sessionBook(sessionId)
    if (!binding) throw new ReaderError('not-reading-session', '当前对话不属于任何书籍')
    let snapshot: any
    try {
      snapshot = await query.readSession(sessionId)
    } catch {
      throw new ReaderError('session-not-found', '当前会话已不存在')
    }
    const turn = findFavoriteTurn(snapshot?.events ?? [], messageId)
    const book = await options.resolveBook(binding.bookId)
    const files = await options.store()
    try {
      const draft = renderFavoriteNote({
        bookTitle: book.title,
        question: turn.question,
        answer: turn.answer,
        time: turn.time,
      })
      const content = await files.create(book, { title: draft.title, kind: 'topic', body: draft.body })
      await options.refreshNotes(book.id)
      return { note: content.note, bookId: book.id, bookTitle: book.title }
    } catch (error) {
      if (error instanceof NoteFileError) throw new ReaderError(error.code, error.message)
      throw error
    }
  }

  return { favoriteConversation }
}
