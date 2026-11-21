import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHTML } from 'linkedom'
import { readPageGeometry } from '../src/client/modules/reader/page-geometry.ts'
import { anchorAtPage, pageOfAnchor } from '../src/client/modules/reader/paging-model.ts'
import type { LayoutInfo } from '../src/client/modules/reader/paging-model.ts'

interface RectLike {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

function rect(left: number, top: number, width: number, height: number): RectLike {
  return { left, top, right: left + width, bottom: top + height, width, height }
}

function patchRects(element: any, rects: RectLike[]): void {
  element.getClientRects = () => rects
}

/** linkedom 没有布局引擎，这里只替换矩形返回值，DOM 查询与属性解析仍走真实实现。 */
function setup() {
  const { document } = parseHTML(`
    <div id="inner">
      <p data-block-index="0">source 0</p>
      <div data-translation-index="0">translation 0</div>
      <p data-block-index="1">source 1</p>
    </div>
  `)
  const inner = document.getElementById('inner') as any
  inner.ownerDocument.defaultView.getComputedStyle = () => ({
    borderLeftWidth: '0',
    borderTopWidth: '0',
    paddingLeft: '0',
    paddingTop: '0',
  })
  // 视口原点 (100, 50)，当前滚到第 1 页（840px）。
  inner.getBoundingClientRect = () => ({ left: 100, top: 50, right: 900, bottom: 650, width: 800, height: 600 })
  inner.scrollLeft = 840
  const nodes = [...inner.querySelectorAll('[data-block-index], [data-translation-index]')] as any[]
  return { inner, nodes }
}

test('read_page_geometry_merges_translation_fragments', () => {
  const { inner, nodes } = setup()
  patchRects(nodes[0], [rect(-740, 50, 800, 100)])
  patchRects(nodes[1], [rect(100, 50, 800, 120), rect(100, 50, 0, 0)])
  patchRects(nodes[2], [rect(940, 50, 800, 100)])

  const geometry = readPageGeometry(inner)
  assert.deepEqual(geometry.blocks.map(block => block.index), [0, 1])
  assert.equal(geometry.blocks[0].rects.length, 2)
  assert.deepEqual(geometry.blocks[0].rects.map(item => item.part ?? 'source'), ['source', 'translation'])
  assert.equal(geometry.blocks[0].rects[0].left, 0)
  assert.equal(geometry.blocks[0].rects[1].left, 840)
  assert.equal(geometry.blocks[1].rects[0].left, 1680)
})

test('read_page_geometry_round_trips_translation_page', () => {
  const { inner, nodes } = setup()
  patchRects(nodes[0], [rect(-740, 50, 800, 100)])
  patchRects(nodes[1], [rect(100, 50, 800, 120)])
  patchRects(nodes[2], [rect(940, 50, 800, 100)])

  const geometry = readPageGeometry(inner)
  const layout: LayoutInfo = { columns: 1, columnWidth: 800, pitch: 840, pageCount: 3 }
  const anchor = anchorAtPage(geometry, 1, layout, 'c1')
  assert.deepEqual(anchor, {
    kind: 'point',
    chapterId: 'c1',
    blockIndex: 0,
    blockFraction: 0,
    part: 'translation',
  })
  assert.equal(pageOfAnchor(geometry, anchor, layout), 1)
  assert.deepEqual(anchorAtPage(geometry, 2, layout, 'c1'), {
    kind: 'point',
    chapterId: 'c1',
    blockIndex: 1,
    blockFraction: 0,
  })
})
