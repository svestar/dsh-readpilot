import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createPromptPresetStore,
  DEFAULT_PROMPT_PRESETS,
  DEFAULT_PROMPT_PRESETS_EN,
} from '../src/host/modules/prompts/store.ts'
import { renderPrompt } from '../src/shared/prompt-render.ts'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

async function tempStore(t: any) {
  const dataDir = await mkdtemp(join(tmpdir(), 'dsh-readpilot-presets-'))
  t.after(() => rm(dataDir, { recursive: true, force: true }))
  return { dataDir, store: createPromptPresetStore(dataDir) }
}

test('prompt_presets_seed_edit_reset_and_delete', async t => {
  const { store } = await tempStore(t)
  const initial = await store.list()
  assert.equal(initial.length, DEFAULT_PROMPT_PRESETS.length)
  assert.ok(initial.length >= 12)
  assert.ok(initial.some(item => item.id === 'character'))
  assert.ok(initial.some(item => item.id === 'craft'))
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

test('prompt_presets_migrate_new_defaults_once', async t => {
  const { dataDir, store } = await tempStore(t)
  await writeFile(join(dataDir, 'presets.json'), JSON.stringify([
    { id: 'explain', title: '旧解释', template: '旧 {{selection}}', builtin: true },
  ]), 'utf8')
  const migrated = await store.list()
  assert.ok(migrated.some(item => item.id === 'explain'))
  assert.ok(migrated.some(item => item.id === 'character'))
  assert.equal(migrated.some(item => item.id === 'terms'), false)
  const file = JSON.parse(await readFile(join(dataDir, 'presets.json'), 'utf8'))
  assert.equal(file.version, 4)

  assert.equal(await store.remove('character'), true)
  assert.equal((await store.list()).some(item => item.id === 'character'), false)
})

test('prompt_presets_localize_unedited_builtins', async t => {
  const { store } = await tempStore(t)
  const english = await store.list('en')
  assert.equal(english.length, DEFAULT_PROMPT_PRESETS_EN.length)
  assert.equal(english.find(item => item.id === 'explain')?.title, 'Explain this passage')
  assert.match(english.find(item => item.id === 'explain')?.template ?? '', /Explain this passage/)

  await store.save({ id: 'explain', title: 'My explanation', template: 'Custom {{selection}}' })
  const editedEn = await store.list('en')
  const editedZh = await store.list('zh')
  assert.equal(editedEn.find(item => item.id === 'explain')?.title, 'My explanation')
  assert.equal(editedZh.find(item => item.id === 'explain')?.title, 'My explanation')

  await store.reset()
  assert.equal((await store.list('en')).find(item => item.id === 'explain')?.title, 'Explain this passage')
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, '解释这段')
})

test('prompt_presets_save_unchanged_builtin_keeps_localization', async t => {
  const { dataDir, store } = await tempStore(t)
  const explain = (await store.list('en')).find(item => item.id === 'explain')
  assert.ok(explain)
  await store.save({ title: '临时预设', template: '临时 {{selection}}' })

  await store.save({ id: 'explain', title: explain.title, template: explain.template }, 'en')
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, '解释这段')
  const file = JSON.parse(await readFile(join(dataDir, 'presets.json'), 'utf8'))
  assert.equal(file.presets.find((item: any) => item.id === 'explain').edited, undefined)

  await store.save({ id: 'explain', title: '自定义解释', template: '自定义 {{selection}}' })
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, '自定义解释')
})

test('prompt_presets_other_language_default_is_an_edit', async t => {
  const { store } = await tempStore(t)
  const zh = DEFAULT_PROMPT_PRESETS.find(item => item.id === 'explain')
  assert.ok(zh)
  await store.save({ title: '临时预设', template: '临时 {{selection}}' })

  const saved = await store.save({ id: 'explain', title: zh.title, template: zh.template }, 'en')
  assert.equal(saved.edited, true)
  assert.equal((await store.list('en')).find(item => item.id === 'explain')?.title, zh.title)
  assert.equal((await store.list('zh')).find(item => item.id === 'explain')?.title, zh.title)
})

test('prompt_presets_simplify_untouched_defaults_on_v2', async t => {
  const { dataDir, store } = await tempStore(t)
  await writeFile(join(dataDir, 'presets.json'), JSON.stringify({
    version: 2,
    presets: [
      {
        id: 'explain',
        title: '解释这段',
        template: '请解释下面这段内容，并结合《{{book}}》{{chapter}} 的上下文说明它的意思：\n\n{{selection}}',
        builtin: true,
      },
      { id: 'custom', title: '自定义', template: '自定义 {{selection}}', builtin: false },
    ],
  }), 'utf8')
  const list = await store.list()
  assert.equal(list.find(item => item.id === 'explain')?.template, '解释这段，结合《{{book}}》{{chapter}} 的上下文：\n\n{{selection}}')
  assert.equal(list.find(item => item.id === 'custom')?.template, '自定义 {{selection}}')
  assert.equal(list.some(item => item.id === 'character'), false)
})

test('prompts_rpc_uses_host_workspace_language', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library, locale: 'en' })

  const value = await api.prompts({ action: 'list', locale: 'zh' })
  assert.equal(value.presets.find((item: any) => item.id === 'explain')?.title, 'Explain this passage')
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

