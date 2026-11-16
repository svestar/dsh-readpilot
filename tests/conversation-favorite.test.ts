import test from 'node:test'
import assert from 'node:assert/strict'
import { createFavoriteHandler, findFavoriteTurn, renderFavoriteNote, renderFavoriteTitle } from '../src/host/modules/notes/favorite.ts'

const STAMP = new Date(2026, 10, 16, 21, 40, 12).getTime()

function events(): any[] {
  return [
    { type: 'turn/start', seq: 1, time: 1, data: { turn: 1 } },
    { type: 'user/message', seq: 2, time: 2, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '给我这本书的导读' }] } },
    {
      type: 'assistant/message',
      seq: 3,
      time: STAMP,
      data: { turn: 1, step: 1, message: { id: 'm1', content: [{ type: 'text', text: '这是一段导读。' }] } },
    },
  ]
}

test('conversation_favorite_pairs_question_and_answer', () => {
  const turn = findFavoriteTurn(events(), 'm1')
  assert.equal(turn.question, '给我这本书的导读')
  assert.equal(turn.answer, '这是一段导读。')
  assert.equal(turn.time, STAMP)
})

test('conversation_favorite_rejects_missing_message', () => {
  assert.throws(() => findFavoriteTurn(events(), 'missing'), (error: any) => error.code === 'message-not-found')
})

test('conversation_favorite_rejects_empty_answer', () => {
  const input = events()
  input[2].data.message.content = []
  assert.throws(() => findFavoriteTurn(input, 'm1'), (error: any) => error.code === 'favorite-empty')
})

test('conversation_favorite_renders_topic_note', () => {
  const note = renderFavoriteNote({
    bookTitle: '三体',
    question: '给我这本书的导读',
    answer: '这是一段导读。',
    time: STAMP,
  })
  assert.equal(note.title, renderFavoriteTitle(STAMP))
  assert.ok(note.title.startsWith('对话收藏 '))
  assert.ok(note.body.includes('> 收藏自《三体》伴读对话'))
  assert.ok(note.body.includes('## 我的问题'))
  assert.ok(note.body.includes('给我这本书的导读'))
  assert.ok(note.body.includes('## 伴读回答'))
  assert.ok(note.body.includes('这是一段导读。'))
})

test('conversation_favorite_handler_creates_long_note', async () => {
  let created: any
  let refreshed = ''
  const handler = createFavoriteHandler({
    ctx: { get: () => ({ readSession: async () => ({ events: events() }) }) },
    sessionBook: async () => ({ bookId: 'b1', title: '三体' }),
    resolveBook: async () => ({ id: 'b1', title: '三体' }) as any,
    store: async () => ({
      create: async (book: any, input: any) => {
        created = { book, input }
        return { note: { id: 'note-1' }, body: input.body, hash: 'hash' }
      },
    }) as any,
    refreshNotes: async (bookId: string) => { refreshed = bookId },
  })
  const result = await handler.favoriteConversation({ sessionId: 's1', messageId: 'm1' })
  assert.equal(created.book.id, 'b1')
  assert.equal(created.input.kind, 'topic')
  assert.ok(created.input.title.startsWith('对话收藏 '))
  assert.ok(created.input.body.includes('这是一段导读。'))
  assert.equal(refreshed, 'b1')
  assert.equal(result.note.id, 'note-1')
})

test('conversation_favorite_requires_reading_session', async () => {
  const handler = createFavoriteHandler({
    ctx: { get: () => ({ readSession: async () => ({ events: events() }) }) },
    sessionBook: async () => null,
    resolveBook: async () => ({ id: 'b1', title: '三体' }) as any,
    store: async () => ({ create: async () => null }) as any,
    refreshNotes: async () => {},
  })
  await assert.rejects(
    handler.favoriteConversation({ sessionId: 's1', messageId: 'm1' }),
    (error: any) => error.code === 'not-reading-session',
  )
})
