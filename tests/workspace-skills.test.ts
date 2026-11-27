import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { ensureWorkspaceSkills } from '../src/host/modules/library/workspace-skills.ts'
import { createReaderApi } from '../src/host/app.ts'
import { fakeContext, makeLibrary } from './support/api-helpers.ts'

function skillFile(root: string, name: string): string {
  return join(root, '.dsh', 'skills', name, 'SKILL.md')
}

test('workspace_skills_created_with_frontmatter', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-skills-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  assert.equal(await ensureWorkspaceSkills(root, 'zh'), true)
  const notes = await readFile(skillFile(root, 'dsh-readpilot-notes'), 'utf8')
  assert.match(notes, /^---\nname: dsh-readpilot-notes\ndescription: Use when/)
  assert.match(notes, /dsh-readpilot:skill:begin/)
  assert.match(notes, /dsh-readpilot:skill:end/)
  assert.match(notes, /阅读笔记流程/)
  assert.match(notes, /reader_note/)
  assert.match(notes, /reader_notes/)

  const memory = await readFile(skillFile(root, 'dsh-readpilot-memory'), 'utf8')
  assert.match(memory, /^---\nname: dsh-readpilot-memory\ndescription: Use when/)
  assert.match(memory, /阅读记忆流程/)
  assert.match(memory, /saved/)
  assert.equal(await ensureWorkspaceSkills(root, 'zh'), false)
})

test('workspace_skills_follow_language', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-skills-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  await ensureWorkspaceSkills(root, 'zh')
  assert.equal(await ensureWorkspaceSkills(root, 'en'), true)
  const notes = await readFile(skillFile(root, 'dsh-readpilot-notes'), 'utf8')
  assert.match(notes, /^---\nname: dsh-readpilot-notes\ndescription: Use when/)
  assert.match(notes, /Reading notes workflow/)
  assert.doesNotMatch(notes, /阅读笔记流程/)
  assert.equal((notes.match(/dsh-readpilot:skill:begin/g) ?? []).length, 1)
})

test('workspace_skills_repair_missing_frontmatter', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-skills-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const file = skillFile(root, 'dsh-readpilot-notes')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, '<!-- dsh-readpilot:skill:begin -->\n旧正文\n<!-- dsh-readpilot:skill:end -->\n', 'utf8')

  assert.equal(await ensureWorkspaceSkills(root, 'zh'), true)
  const repaired = await readFile(file, 'utf8')
  assert.match(repaired, /^---\nname: dsh-readpilot-notes\ndescription: Use when/)
  assert.match(repaired, /阅读笔记流程/)
  assert.doesNotMatch(repaired, /旧正文/)
  assert.equal((repaired.match(/dsh-readpilot:skill:begin/g) ?? []).length, 1)
})

test('workspace_skills_repair_empty_frontmatter', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-skills-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const file = skillFile(root, 'dsh-readpilot-notes')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, '---\n---\n<!-- dsh-readpilot:skill:begin -->\n旧正文\n<!-- dsh-readpilot:skill:end -->\n', 'utf8')

  assert.equal(await ensureWorkspaceSkills(root, 'zh'), true)
  const repaired = await readFile(file, 'utf8')
  assert.match(repaired, /^---\nname: dsh-readpilot-notes\ndescription: Use when/)
  assert.equal(repaired.split('\n').filter(line => line === '---').length, 2)
  assert.match(repaired, /阅读笔记流程/)
  assert.doesNotMatch(repaired, /旧正文/)
})

test('workspace_skills_preserve_extra_frontmatter', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-skills-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const file = skillFile(root, 'dsh-readpilot-notes')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(
    file,
    '---\nname: 旧技能\ndescription: 旧描述\nlicense: MIT\n---\n<!-- dsh-readpilot:skill:begin -->\n旧正文\n<!-- dsh-readpilot:skill:end -->\n',
    'utf8',
  )

  assert.equal(await ensureWorkspaceSkills(root, 'zh'), true)
  const repaired = await readFile(file, 'utf8')
  assert.match(repaired, /^---\nname: dsh-readpilot-notes\ndescription: Use when/)
  assert.match(repaired, /license: MIT/)
  assert.match(repaired, /阅读笔记流程/)
  assert.doesNotMatch(repaired, /旧正文|旧描述/)
})

test('workspace_skills_preserve_user_owned_file', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-skills-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const file = skillFile(root, 'dsh-readpilot-notes')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, '用户自己的技能', 'utf8')

  assert.equal(await ensureWorkspaceSkills(root, 'zh'), true)
  assert.equal(await readFile(file, 'utf8'), '用户自己的技能')
})

test('workspace_skills_repair_deleted_on_state', async t => {
  const { library, data } = await makeLibrary(t)
  const api = createReaderApi({ ctx: fakeContext(), dataDir: data })
  await api.configureLibrary({ path: library })
  const file = skillFile(library, 'dsh-readpilot-memory')
  await rm(file)

  const state = await api.state()
  assert.equal(state.promptSync.ok, true)
  const repaired = await readFile(file, 'utf8')
  assert.match(repaired, /name: dsh-readpilot-memory/)
  assert.match(repaired, /阅读记忆流程/)
})

test('workspace_skills_skip_empty_library', async () => {
  assert.equal(await ensureWorkspaceSkills('', 'zh'), false)
})
