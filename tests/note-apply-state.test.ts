import test from 'node:test'
import assert from 'node:assert/strict'
import { nextActiveOnApply } from '../src/client/modules/notes/apply-state.ts'
import type { ActiveNote } from '../src/client/modules/notes/apply-state.ts'

function note(id: string, body: string): ActiveNote {
  return { note: { id } as any, body, hash: `${id}-${body}` }
}

test('note_apply_keeps_preview_closed', () => {
  assert.equal(nextActiveOnApply(null, note('new-note', '正文')), null)
  const open = note('open-note', '旧正文')
  assert.equal(nextActiveOnApply(open, note('new-note', '正文')), open)
})

test('note_apply_syncs_open_preview', () => {
  const applied = nextActiveOnApply(note('book', '旧正文'), note('book', '新正文'))
  assert.equal(applied?.note.id, 'book')
  assert.equal(applied?.body, '新正文')
  assert.equal(applied?.hash, 'book-新正文')
})
