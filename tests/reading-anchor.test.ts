import test from 'node:test'
import assert from 'node:assert/strict'
import { blocksText, contextAround, hashText, offsetInChapter } from '../src/client/modules/reader/anchor.ts'

test('anchor_context_roundtrip', () => {
  const blocks = [
    { type: 'p', text: '第一段文字' },
    { type: 'p', text: '第二段 target 文字' },
  ]
  const text = blocksText(blocks)
  assert.equal(text, '第一段文字\n\n第二段 target 文字')
  const offset = offsetInChapter(blocks, 1, '第二段 '.length)
  assert.equal(offset, 7 + '第二段 '.length)
  const context = contextAround(text, offset, offset + 'target'.length, 4)
  assert.equal(context.prefix, '第二段 ')
  assert.equal(context.suffix, ' 文字')
  assert.equal(hashText(text), hashText(text))
  assert.notEqual(hashText(text), hashText(text + '!'))
})
