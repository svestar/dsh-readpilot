import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { decodeText, formatOf, parseBook, splitChapters } from '../src/host/modules/reading/formats.ts'

test('split_chinese_chapters', () => {
  const text = [
    '序言',
    '',
    '这是一段开场。',
    '',
    '第一章 初见',
    '',
    '第一章的正文。',
    '',
    '第二章 再会',
    '',
    '第二章的正文。',
  ].join('\n')
  const chapters = splitChapters(text, 'txt')
  assert.equal(chapters.length, 3)
  assert.equal(chapters[0].title, '前言')
  assert.equal(chapters[1].title, '第一章 初见')
  assert.equal(chapters[2].title, '第二章 再会')
  assert.match(chapters[1].body, /第一章的正文/)
})

test('parse_markdown_metadata', () => {
  const markdown = [
    '---',
    'title: 测试书',
    'author: 张三',
    '---',
    '',
    '# 第一章',
    '',
    '你好 **世界**。',
    '',
    '## 第二章',
    '',
    '- 条目一',
  ].join('\n')
  const book = parseBook(Buffer.from(markdown, 'utf8'), 'md', 'E:\\Books\\demo.md')
  assert.equal(book.title, '测试书')
  assert.equal(book.author, '张三')
  assert.equal(book.chapters.length, 2)
  assert.equal(book.chapters[0].title, '第一章')
  assert.equal(book.chapters[0].blocks[0].type, 'p')
  assert.equal(book.chapters[1].blocks[0].type, 'li')
})

test('parse_markdown_uses_filename_title', () => {
  const markdown = [
    '# 一级标题不是书名',
    '',
    '正文。',
    '',
    '## 第一节',
    '',
    '更多正文。',
  ].join('\n')
  const book = parseBook(Buffer.from(markdown, 'utf8'), 'md', join('Books', 'My Notes.md'))
  assert.equal(book.title, 'My Notes')
  assert.equal(book.chapters[0].title, '一级标题不是书名')
})

test('decode_legacy_chinese', () => {
  const gb18030 = Buffer.from([0xb5, 0xda, 0xd2, 0xbb, 0xd5, 0xc2])
  assert.equal(decodeText(gb18030), '第一章')
})

test('decode_invalid_text_rejected', () => {
  assert.throws(() => decodeText(Buffer.from([0x81, 0x30])), /无法识别文本编码/)
})

test('format_of_known_suffixes', () => {
  assert.equal(formatOf('a.EPUB'), 'epub')
  assert.equal(formatOf('b.markdown'), 'md')
  assert.equal(formatOf('c.txt'), 'txt')
  assert.equal(formatOf('d.log'), null)
})
test('parse_markdown_image_block', () => {
  const markdown = [
    '# 图片',
    '',
    '![系统架构](images/arch.png)',
    '',
    '正文。',
  ].join('\n')
  const book = parseBook(Buffer.from(markdown, 'utf8'), 'md', 'book.md')
  const blocks = book.chapters[0].blocks
  assert.deepEqual(blocks[0], { type: 'image', text: '系统架构', src: 'images/arch.png', alt: '系统架构' })
  assert.equal(blocks[1].type, 'p')
})
