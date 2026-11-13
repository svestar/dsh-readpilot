import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureWorkspacePrompt, READING_PROMPT } from '../src/agent/workspace-prompt.ts'
import { createReaderApi } from '../src/api/index.ts'

test('workspace_prompt_created_and_managed', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspacePrompt(root), true)
  const created = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(created, /dsh-readpilot:prompt:begin/)
  assert.match(created, /dsh-readpilot:prompt:end/)
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

test('workspace_prompt_replaces_managed_block', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'AGENTS.md'), '<!-- dsh-readpilot:prompt:begin -->\n旧内容\n<!-- dsh-readpilot:prompt:end -->\n', 'utf8')
  assert.equal(await ensureWorkspacePrompt(root), true)
  const content = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.doesNotMatch(content, /旧内容/)
  assert.ok(content.includes(READING_PROMPT))
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
