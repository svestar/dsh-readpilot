import test from 'node:test'
import assert from 'node:assert/strict'
import { HELP_TOPICS } from '../src/client/modules/help/help-content.ts'

test('help_topics_cover_the_main_workflows', () => {
  assert.ok(HELP_TOPICS.length >= 8)
  assert.equal(new Set(HELP_TOPICS.map(topic => topic.id)).size, HELP_TOPICS.length)
  for (const topic of HELP_TOPICS) {
    assert.ok(topic.titleKey.startsWith('help'))
    assert.ok(topic.bodyKey.endsWith('Body'))
  }
})
