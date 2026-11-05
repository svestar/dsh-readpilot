import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAnswerNote, lastAssistantText } from '../src/client/answer-note.ts'

test('last_assistant_answer_is_used', () => {
  assert.equal(lastAssistantText([]), '')
  assert.equal(lastAssistantText([{ role: 'user', text: '问题' }]), '')
  assert.equal(lastAssistantText([
    { role: 'assistant', text: '第一版' },
    { role: 'user', text: '追问' },
    { role: 'assistant', text: '  最终回答  ' },
    { role: 'user', text: '还在等' },
  ]), '最终回答')
})

test('answer_note_payload_is_built', () => {
  const anchor = { quote: '原文', chapterId: 'c1', blockIndex: 3, offset: 12 }
  assert.deepEqual(buildAnswerNote(anchor, '  回答 '), {
    quote: '原文',
    note: '回答',
    chapterId: 'c1',
    blockIndex: 3,
    offset: 12,
  })
  assert.equal(buildAnswerNote(null, '回答'), null)
  assert.equal(buildAnswerNote(anchor, '   '), null)
  assert.equal(buildAnswerNote({ ...anchor, quote: ' ' }, '回答'), null)
  assert.equal(buildAnswerNote({ ...anchor, chapterId: '' }, '回答'), null)
  assert.deepEqual(buildAnswerNote({ ...anchor, blockIndex: -1, offset: 1.5 }, '回答'), {
    quote: '原文',
    note: '回答',
    chapterId: 'c1',
    blockIndex: 0,
    offset: 0,
  })
})
