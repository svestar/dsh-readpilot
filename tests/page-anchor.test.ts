import test from 'node:test'
import assert from 'node:assert/strict'
import {
  anchorAtPage,
  anchorOfFraction,
  fractionOfAnchor,
  layoutInfoOf,
  pageOfAnchor,
  turnTarget,
} from '../src/client/modules/reader/paging-model.ts'
import { chapterFractionPercent, measurePageMetrics } from '../src/client/modules/reader/paging.ts'
import type { BlockRect, LayoutInfo, PageGeometry } from '../src/client/modules/reader/paging-model.ts'

function frame(columns: number, columnWidth: number, gap: number, pageCount: number): LayoutInfo {
  return { columns, columnWidth, pitch: columnWidth + gap, pageCount }
}

function rect(left: number, height: number, width = 800): BlockRect {
  return { left, top: 0, width, height }
}

function singleColumnGeometry(): PageGeometry {
  return {
    blocks: [
      { index: 0, rects: [rect(0, 100), rect(840, 100)] },
      { index: 1, rects: [rect(1680, 100)] },
      { index: 2, rects: [rect(2520, 100)] },
    ],
  }
}

function point(blockIndex: number, blockFraction: number) {
  return { kind: 'point' as const, chapterId: 'c1', blockIndex, blockFraction }
}

test('layout_info_derives_column_pitch', () => {
  assert.deepEqual(layoutInfoOf(measurePageMetrics(800, 1640, 'single')), {
    columns: 1,
    columnWidth: 800,
    pitch: 840,
    pageCount: 2,
  })
  assert.deepEqual(layoutInfoOf(measurePageMetrics(800, 1220, 'double')), {
    columns: 2,
    columnWidth: 380,
    pitch: 420,
    pageCount: 2,
  })
})

test('turn_moves_inside_chapter', () => {
  assert.deepEqual(turnTarget({
    page: 1, pageCount: 4, delta: 1, previousChapterId: 'c0', nextChapterId: 'c2',
  }), { kind: 'page', page: 2 })
  assert.deepEqual(turnTarget({
    page: 1, pageCount: 4, delta: -1, previousChapterId: 'c0', nextChapterId: 'c2',
  }), { kind: 'page', page: 0 })
})

test('turn_crosses_to_next_chapter_start', () => {
  assert.deepEqual(turnTarget({
    page: 3, pageCount: 4, delta: 1, previousChapterId: 'c0', nextChapterId: 'c2',
  }), { kind: 'chapter', chapterId: 'c2', edge: 'start' })
})

test('turn_crosses_to_previous_chapter_end', () => {
  assert.deepEqual(turnTarget({
    page: 0, pageCount: 4, delta: -1, previousChapterId: 'c0', nextChapterId: 'c2',
  }), { kind: 'chapter', chapterId: 'c0', edge: 'end' })
})

test('turn_stops_at_book_edges', () => {
  assert.equal(turnTarget({
    page: 0, pageCount: 4, delta: -1, previousChapterId: null, nextChapterId: 'c2',
  }), null)
  assert.equal(turnTarget({
    page: 3, pageCount: 4, delta: 1, previousChapterId: 'c0', nextChapterId: null,
  }), null)
  assert.equal(turnTarget({
    page: 1, pageCount: 4, delta: 0, previousChapterId: 'c0', nextChapterId: 'c2',
  }), null)
})

test('chapter_end_survives_layout_growth', () => {
  const anchor = { kind: 'chapterEnd' as const, chapterId: 'c1' }
  assert.equal(pageOfAnchor(null, anchor, frame(1, 800, 40, 6)), 5)
  assert.equal(pageOfAnchor(null, anchor, frame(1, 800, 40, 9)), 8)
  assert.equal(pageOfAnchor(null, anchor, frame(2, 380, 40, 3)), 2)
})

test('page_of_point_anchor_uses_block_fraction', () => {
  const geometry = singleColumnGeometry()
  const layout = frame(1, 800, 40, 4)
  assert.equal(pageOfAnchor(geometry, point(0, 0), layout), 0)
  assert.equal(pageOfAnchor(geometry, point(0, 0.25), layout), 0)
  assert.equal(pageOfAnchor(geometry, point(0, 0.5), layout), 1)
  assert.equal(pageOfAnchor(geometry, point(0, 0.75), layout), 1)
  assert.equal(pageOfAnchor(geometry, point(0, 1), layout), 1)
  assert.equal(pageOfAnchor(geometry, point(1, 0), layout), 2)
})

test('page_of_anchor_handles_missing_geometry', () => {
  assert.equal(pageOfAnchor(null, point(3, 0), frame(1, 800, 40, 4)), 0)
  assert.equal(pageOfAnchor({ blocks: [] }, point(3, 0), frame(1, 800, 40, 4)), 0)
  assert.equal(pageOfAnchor(null, null, frame(1, 800, 40, 4)), 0)
})

test('page_of_anchor_falls_back_to_nearest_block', () => {
  const geometry: PageGeometry = {
    blocks: [
      { index: 0, rects: [rect(0, 100)] },
      { index: 2, rects: [rect(1680, 100)] },
    ],
  }
  const layout = frame(1, 800, 40, 4)
  assert.equal(pageOfAnchor(geometry, point(1, 0), layout), 0)
  assert.equal(pageOfAnchor(geometry, point(3, 0), layout), 2)
  assert.equal(pageOfAnchor({ blocks: [geometry.blocks[1]] }, point(0, 0), layout), 2)
})

test('anchor_at_first_page_is_chapter_start', () => {
  assert.deepEqual(anchorAtPage(singleColumnGeometry(), 0, frame(1, 800, 40, 4), 'c1'), {
    kind: 'chapterStart',
    chapterId: 'c1',
  })
})

test('anchor_at_page_uses_first_visible_block', () => {
  const geometry = singleColumnGeometry()
  const layout = frame(1, 800, 40, 4)
  assert.deepEqual(anchorAtPage(geometry, 1, layout, 'c1'), point(0, 0.5))
  assert.deepEqual(anchorAtPage(geometry, 2, layout, 'c1'), point(1, 0))
  assert.deepEqual(anchorAtPage(geometry, 3, layout, 'c1'), point(2, 0))
})

test('anchor_at_page_round_trips_through_page_of_anchor', () => {
  const geometry = singleColumnGeometry()
  const layout = frame(1, 800, 40, 4)
  for (const page of [0, 1, 2, 3]) {
    const anchor = anchorAtPage(geometry, page, layout, 'c1')
    assert.equal(pageOfAnchor(geometry, anchor, layout), page)
  }
})

test('anchor_at_empty_geometry_is_chapter_end', () => {
  assert.deepEqual(anchorAtPage({ blocks: [] }, 2, frame(1, 800, 40, 4), 'c1'), {
    kind: 'chapterEnd',
    chapterId: 'c1',
  })
})

test('double_page_maps_both_columns_to_same_page', () => {
  const geometry: PageGeometry = {
    blocks: [
      { index: 0, rects: [rect(0, 100, 400)] },
      { index: 1, rects: [rect(440, 100, 400)] },
      { index: 2, rects: [rect(880, 100, 400)] },
    ],
  }
  const layout = frame(2, 400, 40, 2)
  assert.equal(pageOfAnchor(geometry, point(0, 0), layout), 0)
  assert.equal(pageOfAnchor(geometry, point(1, 0), layout), 0)
  assert.equal(pageOfAnchor(geometry, point(2, 0), layout), 1)
  assert.deepEqual(anchorAtPage(geometry, 0, layout, 'c1'), { kind: 'chapterStart', chapterId: 'c1' })
  assert.deepEqual(anchorAtPage(geometry, 1, layout, 'c1'), point(2, 0))
})

test('fraction_round_trips_block_anchor', () => {
  const blocks = [{ text: 'a'.repeat(100) }, { text: 'b'.repeat(300) }]
  const anchor = anchorOfFraction('c1', blocks, 0.5)
  assert.deepEqual(anchor, point(1, 1 / 3))
  assert.equal(fractionOfAnchor(anchor, blocks), 0.5)
  assert.equal(fractionOfAnchor(anchorOfFraction('c1', blocks, 0), blocks), 0)
  assert.equal(fractionOfAnchor(anchorOfFraction('c1', blocks, 1), blocks), 1)
})

test('fraction_at_block_boundary_moves_to_next_block', () => {
  const blocks = [{ text: 'a'.repeat(100) }, { text: 'b'.repeat(300) }]
  assert.deepEqual(anchorOfFraction('c1', blocks, 0.25), point(1, 0))
})

test('fraction_of_unknown_block_falls_back_to_start', () => {
  assert.equal(fractionOfAnchor(point(9, 0.5), [{ text: 'a'.repeat(100) }]), 0)
})

test('chapter_fraction_percent_uses_content_fraction', () => {
  const chapters = [{ chars: 100 }, { chars: 300 }]
  assert.equal(chapterFractionPercent(chapters, 0, 0), 0)
  assert.equal(chapterFractionPercent(chapters, 0, 0.5), 12.5)
  assert.equal(chapterFractionPercent(chapters, 1, 0.5), 62.5)
  assert.equal(chapterFractionPercent(chapters, 1, 1), 100)
  assert.equal(chapterFractionPercent(chapters, 0, Number.NaN), 0)
  assert.equal(chapterFractionPercent([], 0, 0.5), 0)
})
