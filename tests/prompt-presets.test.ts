import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPromptPresetStore, DEFAULT_PROMPT_PRESETS } from '../src/prompt-presets.ts'
import { renderPrompt } from '../src/prompt-render.ts'

async function tempStore(t: any) {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-presets-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  return { dataDir, store: createPromptPresetStore(dataDir) }
}

test('prompt_presets_seed_edit_reset_and_delete', async t => {
  const { store } = await tempStore(t)
  const initial = await store.list()
  assert.equal(initial.length, DEFAULT_PROMPT_PRESETS.length)
  assert.equal(initial[0].builtin, true)

  const created = await store.save({ title: '我的模板', template: '解释 {{selection}}' })
  assert.equal(created.builtin, false)
  assert.match(created.id, /^preset-/)

  const edited = await store.save({ id: 'explain', title: '解释', template: '解释：{{selection}}' })
  assert.equal(edited.id, 'explain')
  assert.equal(edited.title, '解释')

  assert.equal(await store.remove(created.id), true)
  assert.equal(await store.remove(created.id), false)
  const afterDelete = await store.list()
  assert.equal(afterDelete.some(item => item.id === created.id), false)

  const reset = await store.reset()
  assert.deepEqual(reset.map(item => item.id), DEFAULT_PROMPT_PRESETS.map(item => item.id))
  assert.equal((await store.list()).length, DEFAULT_PROMPT_PRESETS.length)
})

test('prompt_presets_validate_input', async t => {
  const { store } = await tempStore(t)
  await assert.rejects(store.save({ title: '', template: 'x' }), /title/)
  await assert.rejects(store.save({ title: 'x', template: '   ' }), /template/)
  await assert.rejects(store.save({ title: 'x', template: 'x'.repeat(4001) }), /template/)
  await assert.rejects(store.save({ id: 'missing', title: 'x', template: 'x' }), /not found/)
  await assert.rejects(store.remove('bad id'), /invalid/)
})

test('render_prompt_replaces_placeholders_literally', () => {
  const output = renderPrompt('《{{book}}》{{chapter}}：{{selection}}\n{{notes}}', {
    book: '书名$&',
    chapter: '第一章',
    selection: '选中 $1 文本',
    notes: '批注 A',
  })
  assert.equal(output, '《书名$&》第一章：选中 $1 文本\n批注 A')
})
