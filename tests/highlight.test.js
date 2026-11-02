import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = {
  __ModuleLoader__: {
    load(registration) {
      globalThis.__readerRegistration = registration
    },
  },
}
globalThis.document = {
  createElement() {
    return { dataset: {}, style: {}, textContent: '' }
  },
  head: { appendChild() {} },
}

await import('../client.js')

const plugin = globalThis.__readerRegistration.factory(() => ({ createElement: () => null }))

test('find_note_occurrence_prefers_offset', () => {
  const text = 'alpha beta alpha gamma'
  const first = plugin.findNoteOccurrence(text, 'alpha', 0)
  const second = plugin.findNoteOccurrence(text, 'alpha', 15)
  assert.deepEqual(first, { start: 0, end: 5 })
  assert.deepEqual(second, { start: 11, end: 16 })
})

test('find_note_occurrence_missing', () => {
  assert.equal(plugin.findNoteOccurrence('hello', 'missing', 0), null)
  assert.equal(plugin.findNoteOccurrence('hello', '', 0), null)
  assert.equal(plugin.findNoteOccurrence('', 'hello', 0), null)
})
