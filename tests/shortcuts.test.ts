import test from 'node:test'
import assert from 'node:assert/strict'
import { READER_SHORTCUT_DEFAULTS, readerShortcut } from '../src/client/shortcuts.ts'

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

test('reader_shortcut_defaults_cover_host_profiles', () => {
  const profiles = [
    'desktop:macos',
    'desktop:windows',
    'desktop:linux',
    'web:macos',
    'web:windows',
    'web:linux',
  ] as const
  for (const command of ['search', 'bookmark'] as const) {
    for (const profile of profiles) {
      const value = READER_SHORTCUT_DEFAULTS[command][profile]
      assert.ok(value)
      assert.match(value.code, /^[A-Z][A-Za-z]+$/)
      assert.ok(Array.isArray(value.modifiers ?? []))
    }
  }
  assert.deepEqual(READER_SHORTCUT_DEFAULTS.search['web:windows'].modifiers, ['primary'])
  assert.deepEqual(READER_SHORTCUT_DEFAULTS.bookmark['desktop:macos'].modifiers, [])
})
