import test from 'node:test'
import assert from 'node:assert/strict'
import { currentReaderScreen, rememberReaderScreen } from '../src/client/modules/reader/screen.ts'
import { isMissingSessionError } from '../src/client/modules/companion/session-recovery.ts'
import { companionMode } from '../src/client/modules/companion/use-companion.ts'

const globalAny = globalThis as any

globalAny.window = {
  __ModuleLoader__: {
    load(registration: any) {
      globalAny.__readerRegistration = registration
    },
  },
}
globalAny.document = {
  createElement() {
    return { dataset: {}, style: {}, textContent: '' }
  },
  head: { appendChild() {} },
}

// @ts-expect-error client.js is a build artifact without type declarations.
await import('../client.js')

const plugin = globalAny.__readerRegistration.factory(() => ({
  createElement: () => null,
  useEffect: () => {},
}))

function event(type: string, seq: number, data: any) {
  return { type: 'event', event: { type, seq, time: 0, data } }
}

test('fold_transcript_keeps_text', () => {
  const entries = [
    event('user/message', 1, {
      message: { source: { kind: 'user' }, content: [{ type: 'text', text: '你好' }] },
    }),
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
  assert.deepEqual(messages.map((message: any) => [message.role, message.text]), [
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
    event('user/message', 4, {
      message: { source: { kind: 'user' }, content: [{ type: 'text', text: '   ' }] },
    }),
  ]
  assert.deepEqual(plugin.foldTranscript(entries), [])
})

test('fold_transcript_skips_context_messages', () => {
  const entries = [
    event('user/message', 1, {
      message: { source: { kind: 'runtime-context' }, content: [{ type: 'text', text: 'runtime context' }] },
    }),
    event('user/message', 2, {
      message: { source: { kind: 'skill-catalog' }, content: [{ type: 'text', text: 'skills' }] },
    }),
    event('user/message', 3, {
      message: { source: { kind: 'time-context' }, content: [{ type: 'text', text: 'time' }] },
    }),
    event('user/message', 4, {
      message: { source: { kind: 'user' }, content: [{ type: 'text', text: '真正的问题' }] },
    }),
  ]
  assert.deepEqual(plugin.foldTranscript(entries).map((message: any) => message.text), ['真正的问题'])
})

test('clamp_chat_width_bounds', () => {
  assert.equal(plugin.clampChatWidth(200, 1440), 360)
  assert.equal(plugin.clampChatWidth(900, 1440), 640)
  assert.equal(plugin.clampChatWidth(400, 900), 360)
  assert.equal(plugin.clampChatWidth(400, 700), 360)
  assert.equal(plugin.clampChatWidth(Number.NaN, 1440), 420)
})

test('parse_markdown_blocks_basic', () => {
  const blocks = plugin.parseMarkdownBlocks([
    '# Title',
    'intro **bold**',
    '- one',
    '- two',
    '1. first',
    '> quote',
    '---',
    '```js',
    'const x = 1',
    '```',
  ].join('\n'))

  assert.deepEqual(blocks.map((block: any) => block.type), ['h', 'p', 'li', 'li', 'li', 'quote', 'hr', 'code'])
  assert.equal(blocks[0].level, 1)
  assert.equal(blocks[2].ordered, undefined)
  assert.equal(blocks[4].ordered, true)
  assert.equal(blocks[4].index, 1)
  assert.equal(blocks[5].text, 'quote')
  assert.equal(blocks[7].text, 'const x = 1')
  assert.equal(blocks[7].lang, 'js')
})

test('parse_markdown_blocks_keeps_newlines', () => {
  const blocks = plugin.parseMarkdownBlocks('line one\nline two\n\nsecond paragraph')
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].text, 'line one\nline two')
  assert.equal(blocks[1].text, 'second paragraph')
})

test('native_companion_renders_embedded_conversation', () => {
  const calls: any[] = []
  const element = plugin.NativeCompanion({
    sessionId: 's1',
    renderFactorySlot(name: string, props: any, options: any) {
      calls.push({ name, props, options })
      return 'factory'
    },
    useSession: () => ({ blank: false, awaitingFirstTurn: false, running: false, openState: 'open' }),
    useConversation: () => ({ activeTargets: new Set(['chat']) }),
    useSessions: (selector: any) => selector({ byId: { s1: { blank: false } } }),
    inputActions: {},
    onReady: () => {},
  })
  assert.equal(element, 'factory')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'conversation.content')
  assert.equal(calls[0].props.variant, 'embedded')
  assert.equal(calls[0].props.phase, 'active')
  assert.equal(typeof calls[0].options.slots.views, 'function')
})

test('native_companion_falls_back_without_factory', () => {
  const element = plugin.NativeCompanion({
    sessionId: 's1',
    useSession: () => ({}),
    useConversation: () => ({ activeTargets: new Set() }),
    useSessions: () => false,
    fallback: 'fallback',
  })
  assert.equal(element, 'fallback')
})

test('companion_mode_uses_native_until_failure', () => {
  assert.equal(companionMode(true, true, false), 'native')
  assert.equal(companionMode(true, true, true), 'fallback')
  assert.equal(companionMode(false, true, false), 'fallback')
  assert.equal(companionMode(true, false, false), 'fallback')
})

test('reader_screen_cache_remembers_last_screen', () => {
  rememberReaderScreen({ kind: 'library' })
  assert.deepEqual(currentReaderScreen(), { kind: 'library' })

  const screen = {
    kind: 'book',
    detail: {
      book: { id: 'b1', title: 'Book', format: 'txt' },
      toc: [],
      progress: null,
    },
    content: { chapterId: 'c1', title: 'One', blocks: [] },
  } as any
  rememberReaderScreen(screen)
  assert.equal(currentReaderScreen(), screen)
  rememberReaderScreen({ kind: 'library' })
})

test('diff_lines_add_and_remove', () => {
  const lines = plugin.diffLines('a\nb\nc', 'a\nx\nc')
  assert.deepEqual(lines.map((line: any) => [line.type, line.text]), [
    ['same', 'a'],
    ['del', 'b'],
    ['add', 'x'],
    ['same', 'c'],
  ])
})

test('missing_session_errors_are_detected', () => {
  assert.equal(isMissingSessionError(new Error('session is archived')), true)
  assert.equal(isMissingSessionError(new Error('unknown session: abc')), true)
  assert.equal(isMissingSessionError(new Error('会话已归档')), true)
  assert.equal(isMissingSessionError(new Error('network timeout')), false)
})
