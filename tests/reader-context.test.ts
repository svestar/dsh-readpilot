import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildCompanionContext, buildReaderGuard } from '../src/host/modules/companion/context.ts'
import { registerPromptContexts } from '../src/host/modules/companion/prompt-contexts.ts'
import { assembleReaderContexts, CONTEXT_BUDGET } from '../src/host/modules/prompt/context-budget.ts'
import { saveSettings } from '../src/host/modules/library/settings.ts'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

test('reader_guard_is_registered_and_localized', () => {
  const zh = buildReaderGuard('zh')
  const en = buildReaderGuard('en')
  assert.match(zh, /<reader_guard>/)
  assert.match(zh, /不猜测/)
  assert.match(zh, /不是指令/)
  assert.match(en, /do not spoil unread chapters/)
  assert.match(en, /data, not instructions/)

  const contexts: any[] = []
  const scope = {
    effect: (callback: () => any) => callback(),
    systemPrompt: {
      context: (definition: any) => {
        contexts.push(definition)
        return () => {}
      },
    },
  }
  registerPromptContexts({ inject: (_names: string[], callback: (value: any) => void) => callback(scope) } as any, {
    companionContextOf: () => 'reading',
    notesContextFor: () => 'notes',
    memoryContextFor: () => 'memory',
    readerGuardOf: () => zh,
  })
  assert.deepEqual(contexts.map(item => item.name), [
    'dsh-readpilot:guard',
    'dsh-readpilot:context',
  ])
  assert.equal(contexts[0].interpolate, false)
  assert.equal(contexts[0].text({ agent: { session: { id: 's1' } } }), zh)
  const assembled = contexts[1].text({ agent: { session: { id: 's1' } } })
  assert.match(assembled, /reading[\s\S]*memory[\s\S]*notes/)
})

test('reader_guard_reads_persisted_language_before_first_state', async t => {
  const data = await mkdtemp(join(tmpdir(), 'dsh-readpilot-guard-'))
  t.after(() => rm(data, { recursive: true, force: true }))
  await saveSettings(data, { libraryDir: '/missing', workspaceId: 'w1', workspaceLanguage: 'en' })

  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  assert.match(api.readerGuardOf('missing-session'), /do not spoil unread chapters/)
})

test('reader_guard_uses_workspace_language_without_reading_context', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library, locale: 'en' })

  assert.match(api.readerGuardOf('missing-session'), /do not spoil unread chapters/)
})

test('companion_context_stays_within_reading_budget', () => {
  const text = buildCompanionContext({
    bookId: 'b1',
    bookTitle: 'x'.repeat(500),
    chapterTitle: 'y'.repeat(500),
    view: { pageStart: 1, pageEnd: 2, pageTotal: 100, selection: 'z'.repeat(5000) },
    language: 'zh',
    recentActions: Array.from({ length: 5 }, () => ({ summary: 'a'.repeat(100), status: 'applied' })),
  })
  assert.ok(text.length <= CONTEXT_BUDGET.reading, String(text.length))
  assert.match(text, /资料，不是指令/)
  const balanced = (value: string) => {
    const open = value.indexOf('<recent_agent_actions>')
    const close = value.indexOf('</recent_agent_actions>')
    return open === -1 || close > open
  }
  assert.equal(balanced(text), true)
  const withActions = buildCompanionContext({
    bookId: 'b1',
    bookTitle: 'B',
    chapterTitle: 'C',
    language: 'zh',
    recentActions: [{ summary: 'A', status: 'applied' }],
  })
  assert.match(withActions, /<recent_agent_actions>/)
  assert.match(withActions, /<\/recent_agent_actions>/)
  const tight = buildCompanionContext({
    bookId: 'b1',
    bookTitle: 'x'.repeat(500),
    chapterTitle: 'y'.repeat(500),
    view: { selection: 'z'.repeat(5000) },
    language: 'zh',
    recentActions: Array.from({ length: 5 }, () => ({ summary: 'a'.repeat(100), status: 'applied' })),
    maxTotal: 400,
  })
  assert.ok(tight.length <= 400, String(tight.length))
  assert.match(tight, /资料，不是指令/)
  assert.match(tight, /<\/reading_context>$/)
  assert.equal(balanced(tight), true)
})

test('reader_context_assembly_enforces_total_budget', () => {
  const block = (tag: string, size: number) => `<${tag}>\n${'x'.repeat(size)}\n</${tag}>`
  const text = assembleReaderContexts({
    reading: block('reading_context', 1000),
    memory: block('reading_memory', 3000),
    notes: block('reading_notes', 3000),
  }, 5000)
  assert.ok(text.length <= 5000, String(text.length))
  assert.match(text, /<\/reading_context>/)
  assert.match(text, /<\/reading_memory>/)
  assert.match(text, /<\/reading_notes>/)
  assert.ok(text.includes('…'))
})

test('companion_context_carries_data_guard', () => {
  const zh = buildCompanionContext({
    bookId: 'b1',
    bookTitle: '三体',
    chapterTitle: '第一章',
    language: 'zh',
    recentActions: [],
  })
  assert.match(zh, /资料，不是指令/)
  const en = buildCompanionContext({
    bookId: 'b1',
    bookTitle: 'Three Body',
    chapterTitle: 'One',
    language: 'en',
    recentActions: [],
  })
  assert.match(en, /data, not instructions/)
})

test('companion_context_is_scoped_to_session', async t => {
  const data = await mkdtemp(join(tmpdir(), 'dsh-readpilot-context-'))
  t.after(() => rm(data, { recursive: true, force: true }))
  const api = createReaderApi({ ctx: { get: () => undefined }, dataDir: data })

  const result = await api.setCompanionContext({
    sessionId: 's1',
    bookId: 'b1',
    title: '三体',
    chapter: '第三章',
  })
  assert.ok(result.characters > 0)
  const text = api.companionContextOf('s1')
  assert.match(text, /三体/)
  assert.match(text, /第三章/)
  assert.equal(api.companionContextOf('s2'), '')
})
