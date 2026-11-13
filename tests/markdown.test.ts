import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdownBlocks } from '../src/markdown/blocks.ts'
import { parseBlocks } from '../src/books/formats.ts'
import { bindRuntime } from '../src/client/common/runtime.ts'
import { inline, renderBlocks } from '../src/client/markdown/render.ts'

const source = [
  '## 标题',
  '',
  '| 名称 | 数量 |',
  '| --- | ---: |',
  '| 苹果 | 2 |',
  '',
  '- [ ] 待办',
  '- [x] 完成',
  '',
  '1. 第一项',
  '   - 嵌套项',
  '',
  '> 第一行',
  '> 第二行',
  '',
  '~~~ts',
  'const x = 1',
  '~~~',
  '',
  '~~删除~~ 和 https://example.com 以及 ![图](./cover.png)',
].join('\n')

test('markdown_parser_handles_gfm_blocks', () => {
  const blocks = parseMarkdownBlocks(source)
  assert.equal(blocks.find(block => block.type === 'table')?.rows?.[1]?.[0], '苹果')
  assert.equal(blocks.filter(block => block.type === 'li' && block.checked === false).length, 1)
  assert.equal(blocks.filter(block => block.type === 'li' && block.checked === true).length, 1)
  assert.equal(blocks.find(block => block.type === 'li' && block.ordered)?.index, 1)
  assert.equal(blocks.find(block => block.type === 'li' && block.indent === 1)?.text, '嵌套项')
  assert.equal(blocks.find(block => block.type === 'quote')?.text, '第一行\n第二行')
  assert.equal(blocks.find(block => block.type === 'code')?.lang, 'ts')
})

test('host_markdown_blocks_share_gfm_parser', () => {
  const blocks = parseBlocks(source, 'md')
  assert.equal(blocks.find(block => block.type === 'table')?.rows?.length, 2)
  assert.equal(blocks.filter(block => block.type === 'li').length, 4)
})

test('markdown_renderer_keeps_safe_inline_nodes_and_block_indexes', () => {
  bindRuntime((name: string) => {
    if (name === 'react') {
      return {
        createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }),
        useState: () => [null, () => {}],
      }
    }
    if (name === 'react-dom') return { createPortal: (node: any) => node }
    return { Modal: null, Tooltip: null, Toast: null }
  })
  const nodes = renderBlocks(parseMarkdownBlocks(source), 'doc')
  const table = nodes.find(node => node.type === 'table')
  assert.equal(table.children[0].type, 'thead')
  const task = nodes.find(node => node.type === 'div' && node.props.className.includes('task'))
  assert.equal(task.children[0].props.checked, false)
  const paragraph = nodes.at(-1)
  const inlineNodes = paragraph.children.flat()
  assert.ok(inlineNodes.some((child: any) => child.type === 's'))
  assert.ok(inlineNodes.some((child: any) => child.type === 'a'))
  assert.ok(inlineNodes.some((child: any) => child.type === 'img'))
  assert.ok(nodes.every(node => node.props['data-block-index'] !== undefined))
  assert.ok(inline('**粗体**', 'x').some(node => node?.type === 'strong'))
})
