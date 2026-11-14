import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNoteResource, parseNoteResource } from '../src/client/modules/notes/note-resource.ts'

test('note_resource_roundtrips_book_and_note', () => {
  const address = buildNoteResource('b1', 'note-1')
  assert.equal(address, 'dsh-resource://dsh-readpilot-note/b1/note-1')
  assert.deepEqual(parseNoteResource(address), { bookId: 'b1', noteId: 'note-1' })
})

test('note_resource_rejects_other_shapes', () => {
  assert.equal(parseNoteResource('dsh-resource://other/b1/note-1'), null)
  assert.equal(parseNoteResource('dsh-resource://dsh-readpilot-note/b1'), null)
  assert.equal(parseNoteResource('dsh-resource://dsh-readpilot-note/b1/n1/extra'), null)
  assert.equal(parseNoteResource('https://example.com'), null)
  assert.equal(parseNoteResource(''), null)
})
