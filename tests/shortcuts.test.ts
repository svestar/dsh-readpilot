import test from 'node:test'
import assert from 'node:assert/strict'
import { readerShortcut } from '../src/client/shortcuts.ts'

const base = { searchOpen: false, hasSelection: false, paged: true }

test('reader_shortcuts_map_keys', () => {
  assert.equal(readerShortcut({ key: 'ArrowRight' }, base), 'next')
  assert.equal(readerShortcut({ key: 'PageDown' }, base), 'next')
  assert.equal(readerShortcut({ key: ' ' }, base), 'next')
  assert.equal(readerShortcut({ key: 'ArrowLeft' }, base), 'prev')
  assert.equal(readerShortcut({ key: 'PageUp' }, base), 'prev')
  assert.equal(readerShortcut({ key: 'f' }, base), 'search')
  assert.equal(readerShortcut({ key: 'F', ctrlKey: true }, base), 'search')
  assert.equal(readerShortcut({ key: 'b' }, base), 'bookmark')
  assert.equal(readerShortcut({ key: 'Escape' }, base), null)
  assert.equal(readerShortcut({ key: 'Escape' }, { ...base, hasSelection: true }), 'clear-selection')
  assert.equal(readerShortcut({ key: 'Escape' }, { ...base, searchOpen: true }), 'close-search')
})

test('reader_shortcuts_ignore_typing_and_modifiers', () => {
  assert.equal(readerShortcut({ key: 'ArrowRight', targetTag: 'INPUT' }, base), null)
  assert.equal(readerShortcut({ key: 'ArrowRight', targetTag: 'textarea' }, base), null)
  assert.equal(readerShortcut({ key: 'f', contentEditable: true }, base), null)
  assert.equal(readerShortcut({ key: 'ArrowRight', altKey: true }, base), null)
  assert.equal(readerShortcut({ key: 'b', ctrlKey: true }, base), null)
  assert.equal(readerShortcut({ key: 'ArrowRight' }, { ...base, paged: false }), null)
  assert.equal(readerShortcut({ key: 'f', isComposing: true }, base), null)
})
