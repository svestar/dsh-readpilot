import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLibraryMetaStore, normalizeTags } from '../src/library-meta.ts'
import {
  categoryCounts,
  filterBooks,
  recentBooks,
  tagCatalogue,
} from '../src/client/library-utils.ts'

test('normalize_tags_deduplicates_and_trims', () => {
  assert.deepEqual(normalizeTags(['  技术 ', '技术', '待读']), ['技术', '待读'])
  assert.throws(() => normalizeTags(['x'.repeat(25)]), /24/)
  assert.throws(() => normalizeTags(Array.from({ length: 21 }, (_, index) => `tag-${index}`)), /20/)
})

test('library_meta_set_list_remove', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-meta-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const store = createLibraryMetaStore(root)
  await store.setTags('book1', ['技术', '技术', '待读'])
  assert.deepEqual(await store.list(), { tags: { book1: ['技术', '待读'] } })
  await store.setTags('book1', [])
  assert.deepEqual(await store.list(), { tags: {} })
  const file = JSON.parse(await readFile(join(root, 'library-meta.json'), 'utf8'))
  assert.deepEqual(file, { tags: {} })
})

test('library_meta_corrupt_file_falls_back', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-meta-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'library-meta.json'), '{not-json', 'utf8')
  const store = createLibraryMetaStore(root)
  assert.deepEqual(await store.list(), { tags: {} })
  await store.setTags('book1', ['技术'])
  assert.deepEqual(await store.list(), { tags: { book1: ['技术'] } })
})

const books = [
  { id: 'b1', title: 'Alpha', format: 'epub', size: 100, mtimeMs: 1000, progress: { chapterTitle: 'One', updatedAt: 5000 } },
  { id: 'b2', title: 'Beta', format: 'md', size: 300, mtimeMs: 3000, progress: null },
  { id: 'b3', title: 'Gamma', format: 'pdf', size: 200, mtimeMs: 2000, progress: { chapterTitle: 'Two', updatedAt: 9000 } },
]
const tags = { b1: ['技术', '待读'], b3: ['技术'] }

test('library_recent_and_tag_filters', () => {
  assert.deepEqual(recentBooks(books, 10).map(book => book.id), ['b3', 'b1'])
  assert.deepEqual(filterBooks(books, tags, { category: 'tag:技术' }).map(book => book.id), ['b3', 'b1'])
  assert.deepEqual(filterBooks(books, tags, { category: 'unread' }).map(book => book.id), ['b2'])
  assert.deepEqual(filterBooks(books, tags, { category: 'format:md' }).map(book => book.id), ['b2'])
  assert.deepEqual(filterBooks(books, tags, { query: '待读' }).map(book => book.id), ['b1'])
})

test('library_sort_and_counts', () => {
  assert.deepEqual(filterBooks(books, tags, { sort: 'title' }).map(book => book.id), ['b1', 'b2', 'b3'])
  assert.deepEqual(filterBooks(books, tags, { sort: 'size' }).map(book => book.id), ['b2', 'b3', 'b1'])
  assert.deepEqual(tagCatalogue(books, tags), [
    { tag: '待读', count: 1 },
    { tag: '技术', count: 2 },
  ])
  const counts = categoryCounts(books, tags)
  assert.equal(counts.all, 3)
  assert.equal(counts.recent, 2)
  assert.equal(counts.unread, 1)
  assert.equal(counts.formats.epub, 1)
})
