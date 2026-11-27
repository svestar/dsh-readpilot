import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureWorkspacePrompt, readWorkspacePromptLanguage } from '../src/host/modules/library/workspace-prompt.ts'
import {
  PROMPT_RULES,
  READING_PROMPT,
  READING_PROMPT_EN,
  readingPrompt,
} from '../src/host/modules/prompt/catalog.ts'
import { createWorkspaceSync } from '../src/host/modules/library/state.ts'
import { loadSettings } from '../src/host/modules/library/settings.ts'
import { buildToolPromptLines, type ToolPromptLine } from '../src/host/modules/tools/prompt-map.ts'
import { createApp, createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

const TOOL_LINES: ToolPromptLine[] = [
  {
    name: 'reader_context',
    zh: '当前/最近书籍、进度、目录、最近笔记',
    en: 'current/recent book, progress, TOC and recent notes',
  },
  {
    name: 'reader_memory',
    zh: '记忆（read/update/forget；scope 为 book/reader）',
    en: 'memory (read/update/forget; scope is book/reader)',
  },
]

test('workspace_prompt_created_and_managed', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspacePrompt(root, 'zh', TOOL_LINES), true)
  const created = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(created, /dsh-readpilot:prompt:begin/)
  assert.match(created, /dsh-readpilot:prompt:end/)
  assert.match(created, /workspace-language:zh/)
  assert.doesNotMatch(created, /version:/)
  assert.ok(created.includes(READING_PROMPT))
  assert.ok(created.includes(readingPrompt('zh', TOOL_LINES)))
  assert.ok(created.includes('reader_context'))

  assert.equal(await ensureWorkspacePrompt(root, 'zh', TOOL_LINES), false)
  await writeFile(join(root, 'AGENTS.md'), `# 用户说明\n\n保留我。\n\n${created}`, 'utf8')
  assert.equal(await ensureWorkspacePrompt(root, 'zh', TOOL_LINES), false)
  const preserved = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(preserved, /保留我/)
  assert.equal((preserved.match(/dsh-readpilot:prompt:begin/g) ?? []).length, 1)
  assert.equal((preserved.match(/dsh-readpilot:prompt:end/g) ?? []).length, 1)
})

test('workspace_prompt_follows_requested_language', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspacePrompt(root, 'en', TOOL_LINES), true)
  const english = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(english, /workspace-language:en/)
  assert.match(english, /## Reading assistant/)
  assert.ok(english.includes(readingPrompt('en', TOOL_LINES)))

  assert.equal(await ensureWorkspacePrompt(root, 'en', TOOL_LINES), false)
  assert.equal(await ensureWorkspacePrompt(root, 'zh', TOOL_LINES), true)
  const chinese = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(chinese, /workspace-language:zh/)
  assert.match(chinese, /## 阅读助手/)
  assert.ok(chinese.includes(readingPrompt('zh', TOOL_LINES)))
})

test('workspace_prompt_migrates_legacy_block_via_configure', async t => {
  const { library, data } = await makeLibrary(t)
  await writeFile(
    join(library, 'AGENTS.md'),
    '用户说明\n\n<!-- dsh-readpilot:prompt:begin -->\n旧内容\n<!-- dsh-readpilot:prompt:end -->\n',
    'utf8',
  )
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const state = await api.configureLibrary({ path: library, locale: 'en' })
  assert.equal(state.settings.workspaceLanguage, 'zh')

  const content = await readFile(join(library, 'AGENTS.md'), 'utf8')
  assert.match(content, /用户说明/)
  assert.match(content, /workspace-language:zh/)
  assert.ok(content.includes(READING_PROMPT))
  assert.equal(content.includes(READING_PROMPT_EN), false)
})

test('workspace_prompt_replaces_managed_block', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'AGENTS.md'), '<!-- dsh-readpilot:prompt:begin -->\n旧内容\n<!-- dsh-readpilot:prompt:end -->\n', 'utf8')

  assert.equal(await ensureWorkspacePrompt(root, 'zh', TOOL_LINES), true)
  const content = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.doesNotMatch(content, /旧内容/)
  assert.ok(content.includes(READING_PROMPT))
})

test('workspace_prompt_repairs_deleted_block_on_state', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const first = await api.configureLibrary({ path: library })
  assert.equal(first.promptSync.ok, true)

  await rm(join(library, 'AGENTS.md'))
  const second = await api.state()
  assert.equal(second.promptSync.ok, true)
  const repaired = await readFile(join(library, 'AGENTS.md'), 'utf8')
  assert.match(repaired, /dsh-readpilot:prompt:begin/)
  assert.ok(repaired.includes('reader_context'))
})

test('workspace_prompt_sync_reports_failure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-sync-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const missing = join(root, 'missing')
  const settings = { libraryDir: missing, workspaceId: null, workspaceLanguage: 'zh' as const }
  const sync = createWorkspaceSync(async () => settings, () => TOOL_LINES)

  const status = await sync.syncFor(settings)
  assert.equal(status.ok, false)
  assert.ok(status.error)
})

test('workspace_language_settings_win_over_prompt_marker', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  const first = await api.configureLibrary({ path: library, locale: 'en' })
  assert.equal(first.settings.workspaceLanguage, 'en')

  const file = join(library, 'AGENTS.md')
  const english = await readFile(file, 'utf8')
  await writeFile(file, english.replace('workspace-language:en', 'workspace-language:zh'), 'utf8')

  const state = await api.state()
  assert.equal(state.settings.workspaceLanguage, 'en')
  const repaired = await readFile(file, 'utf8')
  assert.match(repaired, /workspace-language:en/)
  assert.ok(repaired.includes(READING_PROMPT_EN))
})

test('workspace_language_reads_legacy_marker_version', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-legacy-marker-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(
    join(root, 'AGENTS.md'),
    '<!-- dsh-readpilot:prompt:begin -->\n<!-- dsh-readpilot:workspace-language:en;version:4 -->\n旧内容\n<!-- dsh-readpilot:prompt:end -->\n',
    'utf8',
  )

  assert.equal(await readWorkspacePromptLanguage(root), 'en')
})

test('workspace_language_migrates_from_marker_when_settings_missing', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-language-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const library = join(root, 'books')
  const data = join(root, 'data')
  await mkdir(library, { recursive: true })
  await mkdir(data, { recursive: true })
  await ensureWorkspacePrompt(library, 'en', TOOL_LINES)
  await writeFile(join(data, 'settings.json'), JSON.stringify({ libraryDir: library, workspaceId: 'w1' }), 'utf8')

  assert.equal((await loadSettings(data)).workspaceLanguage, 'en')
})

test('reading_prompt_points_to_workspace_skills', () => {
  const zh = readingPrompt('zh', TOOL_LINES)
  const en = readingPrompt('en', TOOL_LINES)
  assert.match(zh, /dsh-readpilot-notes/)
  assert.match(zh, /dsh-readpilot-memory/)
  assert.match(zh, /记忆默认关闭/)
  assert.match(en, /dsh-readpilot-notes/)
  assert.match(en, /dsh-readpilot-memory/)
  assert.match(en, /Memory is off by default/)
})

test('tool_prompt_map_is_derived_from_schema', () => {
  const lines = buildToolPromptLines([
    {
      name: 'reader_memory',
      description: '',
      parameters: {
        type: 'object',
        properties: {
          action: { enum: ['read', 'update', 'forget'] },
          scope: { enum: ['book', 'reader'] },
        },
      },
      prompt: { core: true, summary: { zh: '记忆', en: 'memory' } },
      output: { schema: {}, render: () => [] },
      execute: async () => null,
    },
    {
      name: 'reader_tag',
      description: '',
      parameters: { type: 'object', properties: {} },
      prompt: { core: false, summary: { zh: '标签', en: 'tags' } },
      output: { schema: {}, render: () => [] },
      execute: async () => null,
    },
  ] as any)
  assert.deepEqual(lines, [{
    name: 'reader_memory',
    zh: '记忆（read/update/forget；scope 为 book/reader）',
    en: 'memory (read/update/forget; scope is book/reader)',
  }])
})

test('reading_prompt_tool_map_covers_core_tools', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-tools-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  const app = createApp({ dataDir })
  try {
    const names = buildToolPromptLines(app.modules.flatMap(module => module.tools)).map(line => line.name)
    for (const name of [
      'reader_books',
      'reader_context',
      'reader_open',
      'reader_read',
      'reader_search',
      'reader_digest',
      'reader_note',
      'reader_notes',
      'reader_memory',
    ]) {
      assert.ok(names.includes(name), name)
    }
    assert.equal(names.includes('reader_tag'), false)
  } finally {
    await app.dispose()
  }
})

test('reading_prompt_zh_en_have_same_structure', () => {
  const zh = readingPrompt('zh', TOOL_LINES)
  const en = readingPrompt('en', TOOL_LINES)
  const numbered = (text: string) => text.split('\n').filter(line => /^\d+\./.test(line))
  const tools = (text: string) => [...text.matchAll(/^- `([^`]+)`/gm)].map(match => match[1])

  assert.equal(numbered(zh).length, PROMPT_RULES.length)
  assert.equal(numbered(en).length, PROMPT_RULES.length)
  assert.deepEqual(tools(zh), TOOL_LINES.map(line => line.name))
  assert.deepEqual(tools(en), TOOL_LINES.map(line => line.name))
  assert.ok(zh.length < 3200, String(zh.length))
  assert.ok(en.length < 3800, String(en.length))
})

test('reading_prompt_catalog_rules_have_stable_ids', () => {
  const ids = PROMPT_RULES.map(rule => rule.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.every(id => /^[a-z][a-z0-9-]*$/.test(id)))
  for (const rule of PROMPT_RULES) {
    assert.ok(rule.zh.trim())
    assert.ok(rule.en.trim())
    assert.ok(readingPrompt('zh', []).includes(rule.zh))
    assert.ok(readingPrompt('en', []).includes(rule.en))
  }
})

test('reading_prompt_matches_golden_snapshot', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-golden-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  const app = createApp({ dataDir })
  try {
    const tools = buildToolPromptLines(app.modules.flatMap(module => module.tools))
    assert.equal(
      readingPrompt('zh', tools),
      await readFile(new URL('./fixtures/reading-prompt.zh.txt', import.meta.url), 'utf8'),
    )
    assert.equal(
      readingPrompt('en', tools),
      await readFile(new URL('./fixtures/reading-prompt.en.txt', import.meta.url), 'utf8'),
    )
  } finally {
    await app.dispose()
  }
})
