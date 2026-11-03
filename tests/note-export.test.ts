import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNotesMarkdown } from '../src/note-export.ts'

const STAMP = Date.UTC(2026, 10, 3, 12, 34, 56)
const STAMP_TEXT = new Date(STAMP).toISOString()

function sampleInput() {
  return {
    book: {
      title: '三体',
      author: '刘慈欣',
      tags: ['科幻', '小说'],
      progress: { chapterTitle: '第一章', percent: 42 },
    },
    notes: [
      { kind: 'book' as const, title: '整书笔记', body: '总览：黑暗森林。' },
      { kind: 'topic' as const, title: '权力', body: '黑暗森林法则。' },
      { kind: 'topic' as const, title: '人物', body: '罗辑。' },
    ],
    marks: [
      { kind: 'highlight' as const, chapterTitle: '第一章', quote: '给岁月以文明', annotation: '时间尺度' },
      { kind: 'note' as const, chapterTitle: '第一章', quote: '弱小和无知不是生存的障碍', note: '傲慢才是。' },
      { kind: 'bookmark' as const, chapterTitle: '第二章', note: '关键转折', pageLabel: '第 12 页' },
    ],
    exportedAt: STAMP,
  }
}

test('note_export_full_export_includes_sections_and_metadata', () => {
  const output = buildNotesMarkdown(sampleInput())

  assert.ok(output.startsWith('# 《三体》阅读笔记\n\n'))
  assert.ok(output.includes('> 作者：刘慈欣\n'))
  assert.ok(output.includes('> 标签：科幻、小说\n'))
  assert.ok(output.includes('> 进度：第一章 · 42%\n'))
  assert.ok(output.includes(`> 导出时间：${STAMP_TEXT}\n`))

  assert.ok(output.includes('\n## 整书笔记\n\n总览：黑暗森林。\n'))
  assert.ok(output.includes('\n## 主题笔记\n\n### 权力\n\n黑暗森林法则。\n'))
  assert.ok(output.includes('### 人物\n\n罗辑。'))
  assert.ok(output.includes('\n## 划线、批注与书签\n\n### 第一章\n\n> 给岁月以文明\n\n时间尺度'))
  assert.ok(output.includes('> 弱小和无知不是生存的障碍\n\n傲慢才是。'))
  assert.ok(output.includes('### 第二章\n\n- 书签：关键转折 · 第 12 页'))

  const sectionOrder = ['## 整书笔记', '## 主题笔记', '## 划线、批注与书签']
    .map(heading => output.indexOf(heading))
  assert.ok(sectionOrder.every(index => index >= 0))
  assert.deepEqual([...sectionOrder].sort((left, right) => left - right), sectionOrder)
  assert.ok(output.endsWith('\n'))
  assert.ok(!output.endsWith('\n\n'))
})

test('note_export_empty_book_has_only_title_and_metadata', () => {
  const output = buildNotesMarkdown({
    book: { title: '空书' },
    notes: [],
    marks: [],
    exportedAt: STAMP,
  })

  assert.equal(output, `# 《空书》阅读笔记\n\n> 导出时间：${STAMP_TEXT}\n`)
  assert.ok(!output.includes('## '))
  assert.ok(!output.includes('作者：'))
  assert.ok(!output.includes('标签：'))
  assert.ok(!output.includes('进度：'))
})

test('note_export_time_is_deterministic_with_exported_at', () => {
  const input = sampleInput()
  const first = buildNotesMarkdown(input)
  const second = buildNotesMarkdown(input)

  assert.equal(first, second)
  assert.ok(first.includes(`导出时间：${STAMP_TEXT}`))

  const later = buildNotesMarkdown({ ...input, exportedAt: STAMP + 60_000 })
  assert.notEqual(first, later)
  assert.ok(later.includes(`导出时间：${new Date(STAMP + 60_000).toISOString()}`))
})

test('note_export_orders_marks_and_escapes_markdown_text', () => {
  const output = buildNotesMarkdown({
    book: { title: 'A_B *star*' },
    notes: [
      { kind: 'topic', title: '暗*森林*', body: '正文' },
      { kind: 'topic', title: '第二篇', body: '第二段' },
    ],
    marks: [
      { kind: 'highlight', chapterTitle: '第二章', quote: 'B 第一篇\n第二行' },
      { kind: 'highlight', chapterTitle: '第一章', quote: 'A 第一篇' },
      { kind: 'bookmark', chapterTitle: '第二章', note: '[重点]', pageLabel: '第 3 页' },
    ],
    exportedAt: STAMP,
  })

  assert.ok(output.startsWith('# 《A\\_B \\*star\\*》阅读笔记'))
  assert.ok(output.includes('### 暗\\*森林\\*'))
  assert.ok(output.includes('### 第二篇'))
  assert.ok(output.indexOf('### 暗\\*森林\\*') < output.indexOf('### 第二篇'))

  assert.ok(output.indexOf('### 第二章') < output.indexOf('### 第一章'))
  assert.ok(output.indexOf('> B 第一篇\n> 第二行') < output.indexOf('- 书签：\\[重点\\] · 第 3 页'))
  assert.ok(output.includes('- 书签：\\[重点\\] · 第 3 页'))

  assert.doesNotMatch(output, /undefined|null/)
})

test('note_export_omits_empty_sections_and_handles_missing_text', () => {
  const output = buildNotesMarkdown({
    book: { title: '边角' },
    notes: [
      { kind: 'book', title: '整书笔记', body: '   \n' },
      { kind: 'topic', title: '', body: '' },
      { kind: 'topic', title: '有标题', body: '' },
      { kind: 'topic', title: '', body: '有正文' },
    ],
    marks: [
      { kind: 'highlight' },
      { kind: 'note', note: '' },
      { kind: 'bookmark', note: '', pageLabel: '' },
    ],
    exportedAt: STAMP,
  })

  assert.ok(!output.includes('## 整书笔记'))
  assert.ok(!output.includes('## 划线、批注与书签'))
  assert.ok(output.includes('## 主题笔记\n\n### 有标题\n\n### 未命名\n\n有正文'))
  assert.doesNotMatch(output, /undefined|null/)
  assert.ok(output.endsWith('\n'))
  assert.ok(!output.endsWith('\n\n'))
})
