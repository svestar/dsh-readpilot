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

const registration = globalThis.__readerRegistration
const plugin = registration.factory(() => ({ createElement: () => null }))

function event(type, seq, data) {
  return { type: 'event', event: { type, seq, time: 0, data } }
}

test('fold_transcript_keeps_text', () => {
  const entries = [
    event('user/message', 1, { message: { content: [{ type: 'text', text: '你好' }] } }),
    event('assistant/message', 2, {
      message: {
        content: [
          { type: 'text', text: '第一段' },
          { type: 'tool-call', id: 'tool-1' },
          { type: 'text', text: '第二段' },
        ],
      },
    }),
    { type: 'transient', event: { type: 'assistant/live-chunk', data: {} } },
  ]

  const messages = plugin.foldTranscript(entries)
  assert.deepEqual(messages.map(message => [message.role, message.text]), [
    ['user', '你好'],
    ['assistant', '第一段\n第二段'],
  ])
  assert.equal(messages[0].key, 'user/message-1')
})

test('fold_transcript_skips_non_text', () => {
  const entries = [
    event('tool/result', 1, { content: 'x' }),
    event('system/notice', 2, { message: { content: [{ type: 'text', text: 'system' }] } }),
    event('assistant/message', 3, { message: { content: [{ type: 'tool-call' }] } }),
    event('user/message', 4, { message: { content: [{ type: 'text', text: '   ' }] } }),
  ]
  assert.deepEqual(plugin.foldTranscript(entries), [])
})
