import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReaderApi } from '../src/api.ts'

function fakeContext() {
  const workspaces: any[] = []
  return {
    workspaces,
    get(name: string) {
      if (name !== 'workspaceRegistry') return undefined
      return {
        archivedSessionIds: [],
        async resolveByPath(path: string) {
          return workspaces.find(workspace => workspace.path === path)
        },
        async create(path: string, title: string) {
          const workspace = { id: `ws-${workspaces.length + 1}`, path, title }
          workspaces.push(workspace)
          return workspace
        },
      }
    },
  }
}

async function makeRoot(t: any) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-backup-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sourceLibrary = join(root, 'source-books')
  const sourceData = join(root, 'source-data')
  const targetLibrary = join(root, 'target-books')
  const targetData = join(root, 'target-data')
  await mkdir(sourceLibrary, { recursive: true })
  await mkdir(targetLibrary, { recursive: true })
  await writeFile(join(sourceLibrary, 'demo.txt'), '第一章 开始\n\n迁移测试内容。', 'utf8')
  return { sourceLibrary, sourceData, targetLibrary, targetData }
}

test('backup_restore_overwrites_matched_book_on_another_path', async t => {
  const { sourceLibrary, sourceData, targetLibrary, targetData } = await makeRoot(t)
  const source = createReaderApi({ ctx: fakeContext() as any, dataDir: sourceData })
  const sourceState = await source.configureLibrary({ path: sourceLibrary })
  const sourceBookId = sourceState.books[0].id
  await source.handleRpc('notes', {
    action: 'add',
    bookId: sourceBookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '迁移测试内容',
    note: '跨 PC 批注',
  })
  await source.saveReadingProgress({ bookId: sourceBookId, chapterId: 'c001', percent: 42 })
  await source.setBookTags({ bookId: sourceBookId, tags: ['迁移'] })
  await source.handleRpc('noteFiles', {
    action: 'create',
    bookId: sourceBookId,
    kind: 'book',
    title: '整书笔记',
    body: '跨 PC 长笔记',
  })

  const backup = await source.backupExport()
  assert.ok(backup.manifest.books.some(book => book.bookId === sourceBookId))

  await copyFile(join(sourceLibrary, 'demo.txt'), join(targetLibrary, 'renamed-on-new-pc.txt'))
  const target = createReaderApi({ ctx: fakeContext() as any, dataDir: targetData })
  const restored = await target.backupRestore({
    archivePath: backup.path,
    libraryPath: targetLibrary,
  })
  assert.equal(restored.matched, 1)
  assert.equal(restored.skipped, 0)
  assert.equal(restored.notes, 1)
  assert.equal(restored.longNotes, 1)
  assert.ok(restored.snapshotPath.endsWith('.zip'))
  assert.equal(restored.state.settings.libraryDir, targetLibrary)
  assert.ok(restored.state.settings.workspaceId)

  const targetState = await target.state()
  assert.equal(targetState.books.length, 1)
  const targetBookId = targetState.books[0].id
  assert.notEqual(targetBookId, sourceBookId)
  const notes = await target.handleRpc('notes', { action: 'list', bookId: targetBookId })
  assert.equal(notes.value.notes.length, 1)
  assert.equal(notes.value.notes[0].note, '跨 PC 批注')
  assert.equal(notes.value.notes[0].bookId, targetBookId)
  assert.equal(targetState.progress[targetBookId].percent, 42)
  assert.deepEqual(targetState.tags[targetBookId], ['迁移'])
  const longNotes = await target.handleRpc('noteFiles', { action: 'list', bookId: targetBookId })
  assert.equal(longNotes.value.notes.length, 1)
  assert.equal(longNotes.value.notes[0].title, '整书笔记')
})

test('backup_restore_skips_books_missing_from_target_library', async t => {
  const { sourceLibrary, sourceData, targetLibrary, targetData } = await makeRoot(t)
  const source = createReaderApi({ ctx: fakeContext() as any, dataDir: sourceData })
  await source.configureLibrary({ path: sourceLibrary })
  const backup = await source.backupExport()

  await writeFile(join(targetLibrary, 'other.txt'), 'different content', 'utf8')
  const target = createReaderApi({ ctx: fakeContext() as any, dataDir: targetData })
  const restored = await target.backupRestore({
    archivePath: backup.path,
    libraryPath: targetLibrary,
  })
  assert.equal(restored.matched, 0)
  assert.equal(restored.skipped, 1)
  const state = await target.state()
  assert.equal(state.books.length, 1)
})

test('backup_restore_overwrites_target_data_and_snapshot_can_roll_back', async t => {
  const { sourceLibrary, sourceData, targetLibrary, targetData } = await makeRoot(t)
  const source = createReaderApi({ ctx: fakeContext() as any, dataDir: sourceData })
  const sourceState = await source.configureLibrary({ path: sourceLibrary })
  const sourceBookId = sourceState.books[0].id
  await source.handleRpc('notes', {
    action: 'add',
    bookId: sourceBookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '迁移测试内容',
    note: '备份中的新批注',
  })
  await source.handleRpc('noteFiles', {
    action: 'create',
    bookId: sourceBookId,
    kind: 'book',
    title: '新长笔记',
    body: '备份中的内容',
  })
  await source.saveReadingProgress({ bookId: sourceBookId, chapterId: 'c001', percent: 42 })
  const backup = await source.backupExport()

  await copyFile(join(sourceLibrary, 'demo.txt'), join(targetLibrary, 'target.txt'))
  const target = createReaderApi({ ctx: fakeContext() as any, dataDir: targetData })
  const targetState = await target.configureLibrary({ path: targetLibrary })
  const targetBookId = targetState.books[0].id
  await target.handleRpc('notes', {
    action: 'add',
    bookId: targetBookId,
    chapterId: 'c001',
    blockIndex: 0,
    offset: 0,
    quote: '迁移测试内容',
    note: '目标原有批注',
  })
  await target.handleRpc('noteFiles', {
    action: 'create',
    bookId: targetBookId,
    kind: 'book',
    title: '原长笔记',
    body: '目标原有内容',
  })
  await target.saveReadingProgress({ bookId: targetBookId, chapterId: 'c001', percent: 10 })

  const restored = await target.backupRestore({ archivePath: backup.path, libraryPath: targetLibrary })
  const afterRestore = await target.state()
  const restoredId = afterRestore.books[0].id
  assert.equal(restored.notes, 1)
  assert.equal(restored.longNotes, 1)
  assert.equal((await target.handleRpc('notes', { action: 'list', bookId: restoredId })).value.notes[0].note, '备份中的新批注')
  assert.equal((await target.handleRpc('noteFiles', { action: 'list', bookId: restoredId })).value.notes[0].title, '新长笔记')
  assert.equal(afterRestore.progress[restoredId].percent, 42)

  const rolledBack = await target.backupRestore({ archivePath: restored.snapshotPath, libraryPath: targetLibrary })
  assert.equal(rolledBack.matched, 1)
  const afterRollback = await target.state()
  const rollbackId = afterRollback.books[0].id
  assert.equal((await target.handleRpc('notes', { action: 'list', bookId: rollbackId })).value.notes[0].note, '目标原有批注')
  assert.equal((await target.handleRpc('noteFiles', { action: 'list', bookId: rollbackId })).value.notes[0].title, '原长笔记')
  assert.equal(afterRollback.progress[rollbackId].percent, 10)
})


test('backup_restore_migrates_presets_memory_and_companion', async t => {
  const { sourceLibrary, sourceData, targetLibrary, targetData } = await makeRoot(t)
  const source = createReaderApi({ ctx: fakeContext() as any, dataDir: sourceData })
  const sourceState = await source.configureLibrary({ path: sourceLibrary })
  const sourceBookId = sourceState.books[0].id
  await mkdir(join(sourceData, 'memory'), { recursive: true })
  await writeFile(join(sourceData, 'presets.json'), '{"version":3,"presets":[]}\n', 'utf8')
  await writeFile(join(sourceData, 'memory', `${sourceBookId}.md`), 'book memory', 'utf8')
  await writeFile(join(sourceData, 'memory', 'reader.md'), 'reader memory', 'utf8')
  await source.setNoteContext({ bookId: sourceBookId, enabled: true })
  const backup = await source.backupExport()

  await copyFile(join(sourceLibrary, 'demo.txt'), join(targetLibrary, 'target.txt'))
  const target = createReaderApi({ ctx: fakeContext() as any, dataDir: targetData })
  const restored = await target.backupRestore({ archivePath: backup.path, libraryPath: targetLibrary })
  assert.equal(restored.matched, 1)
  const targetBookId = (await target.state()).books[0].id
  assert.equal(await readFile(join(targetData, 'memory', `${targetBookId}.md`), 'utf8'), 'book memory')
  assert.equal(await readFile(join(targetData, 'memory', 'reader.md'), 'utf8'), 'reader memory')
  assert.equal(await readFile(join(targetData, 'presets.json'), 'utf8'), '{"version":3,"presets":[]}\n')
  assert.equal((await target.state()).companion.notes[targetBookId], true)
})
