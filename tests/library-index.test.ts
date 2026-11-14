import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { contentKeyFor, scanLibrary } from '../src/host/modules/library/book.ts'
import {
  emptyLibraryIndex,
  loadLibraryIndex,
  reconcileBooks,
} from '../src/host/modules/library/index-store.ts'

test('content_key_ignores_path_and_changes_with_content', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-identity-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const first = join(root, 'a.txt')
  const second = join(root, 'b.txt')
  await writeFile(first, 'same content', 'utf8')
  await writeFile(second, 'same content', 'utf8')
  assert.equal(await contentKeyFor(first, 12), await contentKeyFor(second, 12))
  await writeFile(second, 'other content', 'utf8')
  assert.notEqual(await contentKeyFor(first, 12), await contentKeyFor(second, 13))
})

test('corrupt_index_rebuilds_empty', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-identity-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'library-index.json'), '{not json', 'utf8')
  assert.deepEqual(await loadLibraryIndex(root), emptyLibraryIndex())
})

test('rename_reuses_book_id', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-identity-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const first = join(root, 'a.txt')
  await writeFile(first, 'stable content', 'utf8')
  const index = emptyLibraryIndex()
  const before = reconcileBooks(await scanLibrary(root), index)
  const id = before[0].id

  const renamed = join(root, 'renamed.txt')
  await rename(first, renamed)
  const after = reconcileBooks(await scanLibrary(root), index)
  assert.equal(after.length, 1)
  assert.equal(after[0].id, id)
  assert.equal(after[0].path, renamed)
})

test('duplicate_content_is_marked', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-identity-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'a.txt'), 'same duplicate content', 'utf8')
  await writeFile(join(root, 'b.txt'), 'same duplicate content', 'utf8')
  const index = emptyLibraryIndex()
  const books = reconcileBooks(await scanLibrary(root), index)
  assert.equal(books.length, 2)
  const canonical = books.find(book => !book.duplicateOf)!
  const duplicate = books.find(book => book.duplicateOf)!
  assert.equal(duplicate.duplicateOf, canonical.id)
})
