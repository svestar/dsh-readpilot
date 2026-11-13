import test from 'node:test'
import assert from 'node:assert/strict'
import { PROGRESS_SYNC_EVENT, readProgressSync } from '../src/client/reader/progress-sync.ts'

test('progress_sync_reads_only_well_formed_sidebar_events', () => {
  const event = new CustomEvent(PROGRESS_SYNC_EVENT, {
    detail: { bookId: 'b1', chapterId: 'c1', chapterFraction: 0.4, origin: 'sidebar' },
  })
  assert.deepEqual(readProgressSync(event), {
    bookId: 'b1',
    chapterId: 'c1',
    chapterFraction: 0.4,
    origin: 'sidebar',
  })
  const invalid = new CustomEvent(PROGRESS_SYNC_EVENT, {
    detail: { bookId: 'b1', chapterId: 'c1', chapterFraction: Number.NaN, origin: 'sidebar' },
  })
  assert.equal(readProgressSync(invalid), null)
  const missing = new CustomEvent(PROGRESS_SYNC_EVENT, { detail: { origin: 'sidebar' } })
  assert.equal(readProgressSync(missing), null)
})
