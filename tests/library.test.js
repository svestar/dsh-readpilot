import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bookIdFor, findBookByKey, scanLibrary } from '../src/library.js'

test('scan_lists_books', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-library-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'a.txt'), 'hello', 'utf8')
  await writeFile(join(root, 'b.md'), '# b', 'utf8')
  await writeFile(join(root, 'c.pdf'), '%PDF-1.7', 'utf8')
  await writeFile(join(root, 'skip.log'), 'ignored', 'utf8')
  await writeFile(join(root, 'AGENTS.md'), '# instructions', 'utf8')

  const books = await scanLibrary(root)
  assert.deepEqual(books.map(book => book.title).sort(), ['a', 'b', 'c'])
  assert.equal(books.find(book => book.title === 'a').supported, true)
  assert.equal(books.find(book => book.title === 'c').supported, true)
  assert.equal(findBookByKey(books, 'b').title, 'b')
  assert.equal(findBookByKey(books, 'missing'), undefined)
})

test('book_id_is_stable', () => {
  const first = bookIdFor('E:\\Books\\demo.txt')
  const second = bookIdFor('E:\\Books\\demo.txt')
  assert.equal(first, second)
  assert.notEqual(first, bookIdFor('E:\\Books\\other.txt'))
})
