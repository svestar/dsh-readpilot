import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureWorkspacePrompt, READING_PROMPT } from '../src/workspace-prompt.js'

test('workspace_prompt_created_and_managed', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspacePrompt(root), true)
  const created = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(created, /dsh-reader:prompt:begin/)
  assert.match(created, /dsh-reader:prompt:end/)
  assert.ok(created.includes(READING_PROMPT))
  assert.match(created, /reader_context/)

  assert.equal(await ensureWorkspacePrompt(root), false)
  await writeFile(join(root, 'AGENTS.md'), `# 用户说明\n\n保留我。\n\n${created}`, 'utf8')
  assert.equal(await ensureWorkspacePrompt(root), false)
  const preserved = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.match(preserved, /保留我/)
  assert.equal((preserved.match(/dsh-reader:prompt:begin/g) ?? []).length, 1)
  assert.equal((preserved.match(/dsh-reader:prompt:end/g) ?? []).length, 1)
})

test('workspace_prompt_replaces_managed_block', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-prompt-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'AGENTS.md'), '<!-- dsh-reader:prompt:begin -->\n旧内容\n<!-- dsh-reader:prompt:end -->\n', 'utf8')
  assert.equal(await ensureWorkspacePrompt(root), true)
  const content = await readFile(join(root, 'AGENTS.md'), 'utf8')
  assert.doesNotMatch(content, /旧内容/)
  assert.ok(content.includes(READING_PROMPT))
})
