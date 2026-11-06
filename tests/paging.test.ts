import test from 'node:test'
import assert from 'node:assert/strict'
import type { TestContext } from 'node:test'
import {
  PAGE_ASPECT,
  PAGE_GAP,
  chapterPercent,
  clampPageIndex,
  columnsFor,
  measurePageMetrics,
  pageBounds,
  pageSpanWidth,
  pageStep,
  pageWidthForHeight,
  pdfPagePercent,
} from '../src/client/paging.ts'
import {
  DEFAULT_PAGE_LAYOUT,
  DEFAULT_READING_MODE,
  PAGE_LAYOUT_KEY,
  READING_MODE_KEY,
  readPageLayout,
  readReadingMode,
  savePageLayout,
  saveReadingMode,
} from '../src/client/helpers.ts'

test('columns_for_layouts', () => {
  assert.equal(columnsFor('single'), 1)
  assert.equal(columnsFor('double'), 2)
  assert.equal(pageStep('single'), 1)
  assert.equal(pageStep('double'), 2)
  assert.equal(PAGE_GAP, 40)
})

test('measure_single_column', () => {
  const metrics = measurePageMetrics(800, 1640, 'single')
  assert.deepEqual(metrics, {
    columns: 1,
    columnWidth: 800,
    totalColumns: 2,
    pageCount: 2,
    stride: 840,
  })
})

test('measure_one_page_content', () => {
  assert.deepEqual(measurePageMetrics(800, 800, 'single'), {
    columns: 1,
    columnWidth: 800,
    totalColumns: 1,
    pageCount: 1,
    stride: 840,
  })
  assert.deepEqual(measurePageMetrics(800, 0, 'double'), {
    columns: 2,
    columnWidth: 380,
    totalColumns: 1,
    pageCount: 1,
    stride: 840,
  })
  assert.deepEqual(measurePageMetrics(0, 0, 'double'), {
    columns: 2,
    columnWidth: 1,
    totalColumns: 1,
    pageCount: 1,
    stride: 82,
  })
})

test('measure_exact_two_column_overflow', () => {
  assert.deepEqual(measurePageMetrics(800, 1640, 'single'), {
    columns: 1,
    columnWidth: 800,
    totalColumns: 2,
    pageCount: 2,
    stride: 840,
  })
  assert.deepEqual(measurePageMetrics(800, 1220, 'double'), {
    columns: 2,
    columnWidth: 380,
    totalColumns: 3,
    pageCount: 2,
    stride: 840,
  })
})

test('measure_odd_total_columns', () => {
  const metrics = measurePageMetrics(800, 1220, 'double')
  assert.equal(metrics.totalColumns, 3)
  assert.equal(metrics.pageCount, 2)
  assert.deepEqual(pageBounds(0, 'double', 3), { start: 1, end: 2 })
  assert.deepEqual(pageBounds(1, 'double', 3), { start: 3, end: 3 })
  assert.deepEqual(pageBounds(2, 'double', 3), { start: 3, end: 3 })
})

test('measure_gap_accounting', () => {
  assert.deepEqual(measurePageMetrics(900, 1360, 'double', 20), {
    columns: 2,
    columnWidth: 440,
    totalColumns: 3,
    pageCount: 2,
    stride: 920,
  })
  assert.deepEqual(measurePageMetrics(800, 1200, 'double', 0), {
    columns: 2,
    columnWidth: 400,
    totalColumns: 3,
    pageCount: 2,
    stride: 800,
  })
})

test('measure_invalid_inputs', () => {
  assert.deepEqual(measurePageMetrics(NaN, NaN, 'single'), {
    columns: 1,
    columnWidth: 1,
    totalColumns: 1,
    pageCount: 1,
    stride: 41,
  })
  assert.deepEqual(measurePageMetrics(-100, -50, 'double'), {
    columns: 2,
    columnWidth: 1,
    totalColumns: 1,
    pageCount: 1,
    stride: 82,
  })
  assert.deepEqual(measurePageMetrics(Infinity, 500, 'single'), measurePageMetrics(0, 500, 'single'))
  assert.deepEqual(measurePageMetrics(800, 1220, 'double', -10), measurePageMetrics(800, 1220, 'double'))
  assert.deepEqual(measurePageMetrics(800, 1220, 'double', NaN), measurePageMetrics(800, 1220, 'double'))
  assert.deepEqual(measurePageMetrics(800, 1220, 'double', Infinity), measurePageMetrics(800, 1220, 'double'))
})

test('clamp_page_index', () => {
  assert.equal(clampPageIndex(0, 3), 0)
  assert.equal(clampPageIndex(2, 3), 2)
  assert.equal(clampPageIndex(3, 3), 2)
  assert.equal(clampPageIndex(-1, 3), 0)
  assert.equal(clampPageIndex(1.9, 3), 1)
  assert.equal(clampPageIndex(5, 2), 1)
  assert.equal(clampPageIndex(0, 0), 0)
  assert.equal(clampPageIndex(4, 0), 0)
  assert.equal(clampPageIndex(NaN, 3), 0)
  assert.equal(clampPageIndex(1, NaN), 0)
  assert.equal(clampPageIndex(1, -2), 0)
})

test('page_bounds', () => {
  assert.deepEqual(pageBounds(0, 'single', 10), { start: 1, end: 1 })
  assert.deepEqual(pageBounds(9, 'single', 10), { start: 10, end: 10 })
  assert.deepEqual(pageBounds(12, 'single', 10), { start: 10, end: 10 })
  assert.deepEqual(pageBounds(-3, 'double', 5), { start: 1, end: 2 })
  assert.deepEqual(pageBounds(2, 'double', 5), { start: 5, end: 5 })
  assert.deepEqual(pageBounds(0, 'double', 0), { start: 1, end: 1 })
  assert.deepEqual(pageBounds(0, 'double', -4), { start: 1, end: 1 })
  assert.deepEqual(pageBounds(NaN, 'double', 5), { start: 1, end: 2 })
})

test('page_width_from_height', () => {
  assert.equal(PAGE_ASPECT, 210 / 297)
  assert.equal(pageWidthForHeight(1188, 2000), 1188 * PAGE_ASPECT)
  assert.ok(Math.abs(pageWidthForHeight(1188, 2000) - 840) < 1e-9)
  assert.equal(pageWidthForHeight(1188, 2000, PAGE_ASPECT), 1188 * PAGE_ASPECT)
})

test('page_width_clamps_to_available_width', () => {
  assert.equal(pageWidthForHeight(1188, 600), 600)
  assert.equal(pageWidthForHeight(100, 600), 100 * PAGE_ASPECT)
  assert.equal(pageWidthForHeight(1188, 600, 0.5), 594)
  assert.equal(pageWidthForHeight(1188, 500, 0.5), 500)
})

test('page_width_invalid_inputs', () => {
  assert.equal(pageWidthForHeight(0, 800), 0)
  assert.equal(pageWidthForHeight(-100, 800), 0)
  assert.equal(pageWidthForHeight(NaN, 800), 0)
  assert.equal(pageWidthForHeight(Infinity, 800), 0)
  assert.equal(pageWidthForHeight(800, 0), 0)
  assert.equal(pageWidthForHeight(800, -50), 0)
  assert.equal(pageWidthForHeight(800, NaN), 0)
  assert.equal(pageWidthForHeight(800, Infinity), 0)
})

test('page_width_custom_ratio', () => {
  assert.equal(pageWidthForHeight(1000, 2000, 1.5), 1500)
  assert.equal(pageWidthForHeight(1000, 1200, 1.5), 1200)
  assert.equal(pageWidthForHeight(1000, 2000, 0), 0)
  assert.equal(pageWidthForHeight(1000, 2000, -1), 0)
  assert.equal(pageWidthForHeight(1000, 2000, NaN), 0)
  assert.equal(pageWidthForHeight(1000, 2000, Infinity), 0)
})

test('page_span_single', () => {
  assert.equal(pageSpanWidth(800, 'single'), 800)
  assert.equal(pageSpanWidth(800.5, 'single'), 800.5)
  assert.equal(pageSpanWidth(800, 'single', 20), 800)
  assert.equal(pageSpanWidth(800, 'single', 0), 800)
})

test('page_span_double', () => {
  assert.equal(pageSpanWidth(800, 'double'), 800 * 2 + PAGE_GAP)
  assert.equal(pageSpanWidth(800, 'double'), 1640)
  assert.equal(pageSpanWidth(840.5, 'double'), 840.5 * 2 + PAGE_GAP)
})

test('page_span_double_custom_gap', () => {
  assert.equal(pageSpanWidth(800, 'double', 0), 1600)
  assert.equal(pageSpanWidth(800, 'double', 20), 1620)
  assert.equal(pageSpanWidth(800, 'double', PAGE_GAP), 1640)
})

test('page_span_invalid_inputs', () => {
  assert.equal(pageSpanWidth(0, 'single'), 0)
  assert.equal(pageSpanWidth(-100, 'single'), 0)
  assert.equal(pageSpanWidth(NaN, 'double'), 0)
  assert.equal(pageSpanWidth(Infinity, 'double'), 0)
  assert.equal(pageSpanWidth(800, 'double', -10), 0)
  assert.equal(pageSpanWidth(800, 'double', NaN), 0)
  assert.equal(pageSpanWidth(800, 'double', Infinity), 0)
  assert.equal(pageSpanWidth(0, 'double', 20), 0)
})

function installStorage(t: TestContext): Map<string, string> {
  const values = new Map<string, string>()
  const previous = (globalThis as any).window
  ;(globalThis as any).window = {
    localStorage: {
      getItem(key: string) {
        return values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        values.set(key, String(value))
      },
    },
  }
  t.after(() => {
    if (previous === undefined) delete (globalThis as any).window
    else (globalThis as any).window = previous
  })
  return values
}

test('reading_preferences_default_single_paged', () => {
  assert.equal(DEFAULT_READING_MODE, 'paged')
  assert.equal(DEFAULT_PAGE_LAYOUT, 'single')
  assert.equal(readReadingMode(), 'paged')
  assert.equal(readPageLayout(), 'single')
})

test('reading_preferences_are_global_and_validate_values', t => {
  const values = installStorage(t)
  assert.equal(readReadingMode(), 'paged')
  assert.equal(readPageLayout(), 'single')

  saveReadingMode('scroll')
  savePageLayout('double')
  assert.equal(values.get(READING_MODE_KEY), 'scroll')
  assert.equal(values.get(PAGE_LAYOUT_KEY), 'double')
  assert.equal(readReadingMode(), 'scroll')
  assert.equal(readPageLayout(), 'double')

  values.set(READING_MODE_KEY, 'bogus')
  values.set(PAGE_LAYOUT_KEY, 'bogus')
  assert.equal(readReadingMode(), 'paged')
  assert.equal(readPageLayout(), 'single')
})
test('chapter_percent_weights_chapters_and_pages', () => {
  const chapters = [{ chars: 100 }, { chars: 300 }]
  assert.equal(chapterPercent(chapters, 0, 0, 2), 0)
  assert.equal(chapterPercent(chapters, 0, 1, 2), 12.5)
  assert.equal(chapterPercent(chapters, 1, 0, 2), 25)
  assert.equal(chapterPercent(chapters, 1, 2, 2), 100)
})

test('pdf_page_percent_spans_first_to_last_page', () => {
  assert.equal(pdfPagePercent(1, 5), 0)
  assert.equal(pdfPagePercent(3, 5), 50)
  assert.equal(pdfPagePercent(5, 5), 100)
  assert.equal(pdfPagePercent(1, 1), 0)
})
