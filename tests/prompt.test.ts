import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureWorkspacePrompt, READING_PROMPT, READING_PROMPT_EN } from '../src/host/modules/library/workspace-prompt.ts'
import { createWorkspaceSync } from '../src/host/modules/library/state.ts'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

test('workspace_prompt_created_and_managed', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspacePrompt(root), true)
  const created = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(created, /dsh-readpilot:prompt:begin/)
  assert.match(created, /dsh-readpilot:prompt:end/)
  assert.match(created, /workspace-language:zh;version:2/)
  assert.ok(created.includes(READING_PROMPT))
  assert.match(created, /reader_context/)

  assert.equal(await ensureWorkspacePrompt(root), false)
  await writeFile(join(root, 'AGENTS.md'), `# 用户说明\n\n保留我。\n\n${created}`, 'utf8')
  assert.equal(await ensureWorkspacePrompt(root), false)
  const preserved = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(preserved, /保留我/)
  assert.equal((preserved.match(/dsh-readpilot:prompt:begin/g) ?? []).length, 1)
  assert.equal((preserved.match(/dsh-readpilot:prompt:end/g) ?? []).length, 1)
})

test('workspace_prompt_initializes_english_and_freezes_language', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspacePrompt(root, 'en'), true)
  const english = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(english, /workspace-language:en/)
  assert.match(english, /## Reading assistant/)
  assert.ok(english.includes(READING_PROMPT_EN))

  assert.equal(await ensureWorkspacePrompt(root, 'zh'), false)
  const frozen = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(frozen, /workspace-language:en/)
  assert.ok(frozen.includes(READING_PROMPT_EN))
})

test('workspace_prompt_keeps_legacy_chinese_without_marker', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'AGENTS.md'), '用户说明\n\n<!-- dsh-readpilot:prompt:begin -->\n旧内容\n<!-- dsh-readpilot:prompt:end -->\n', 'utf8')

  assert.equal(await ensureWorkspacePrompt(root, 'en'), true)
  const content = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(content, /用户说明/)
  assert.match(content, /workspace-language:zh/)
  assert.ok(content.includes(READING_PROMPT))
  assert.equal(content.includes(READING_PROMPT_EN), false)
})

test('workspace_prompt_replaces_managed_block', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'AGENTS.md'), '<!-- dsh-readpilot:prompt:begin -->\n旧内容\n<!-- dsh-readpilot:prompt:end -->\n', 'utf8')
  assert.equal(await ensureWorkspacePrompt(root), true)
  const content = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.doesNotMatch(content, /旧内容/)
  assert.ok(content.includes(READING_PROMPT))
})

test('workspace_prompt_keeps_status_out_of_note_body', () => {
  assert.match(READING_PROMPT, /body` \/ `text` 只写正文/)
  assert.match(READING_PROMPT, /不写保存状态/)
  assert.ok(READING_PROMPT.includes('长笔记看 `applied`'))
  assert.ok(READING_PROMPT.includes('短笔记看 `note` / `deleted`'))
  assert.ok(READING_PROMPT_EN.includes('`applied` for long notes'))
  assert.ok(READING_PROMPT_EN.includes('`note` / `deleted` for short notes'))
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
  assert.ok(repaired.includes(READING_PROMPT))
})

test('workspace_prompt_sync_reports_failure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-sync-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const missing = join(root, 'missing')
  const settings = { libraryDir: missing, workspaceId: null, workspaceLanguage: 'zh' as const }
  const sync = createWorkspaceSync(async () => settings)

  const status = await sync.syncFor(settings)
  assert.equal(status.ok, false)
  assert.ok(status.error)
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
