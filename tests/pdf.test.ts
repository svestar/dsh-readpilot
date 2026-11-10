import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { parsePdf } from '../src/formats/pdf.ts'

function escapePdfString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function textAt(text: string, y: number, size: number) {
  return `BT\n/F1 ${size} Tf\n72 ${y} Td\n(${escapePdfString(text)}) Tj\nET`
}

function cellsAt(cells: Array<{ text: string; x: number }>, y: number, size: number) {
  const parts = cells
    .map(cell => `1 0 0 1 ${cell.x} ${y} Tm\n(${escapePdfString(cell.text)}) Tj`)
    .join('\n')
  return `BT\n/F1 ${size} Tf\n${parts}\nET\n`
}

function textContent(page: any) {
  if (Array.isArray(page)) {
    return page.map(line => line.cells
      ? cellsAt(line.cells, line.y, line.size ?? 12)
      : textAt(line.text, line.y, line.size ?? 12)).join('\n')
  }
  return textAt(page, 720, 24)
}

function buildPdf({ pages, info }: { pages: any[]; info?: { title: string; author: string } }) {
  const objects: string[] = []
  const add = (body: string) => {
    objects.push(body)
    return objects.length
  }

  add('<< /Type /Catalog /Pages 2 0 R >>')
  const pagesNumber = add('')
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const kids: number[] = []
  for (const page of pages) {
    const pageNumber = add('')
    kids.push(pageNumber)
    let contents: number | null = null
    if (page !== null) {
      const content = textContent(page)
      contents = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`)
    }
    objects[pageNumber - 1] = [
      '<< /Type /Page',
      '/Parent 2 0 R',
      '/MediaBox [0 0 612 792]',
      '/Resources << /Font << /F1 3 0 R >> >>',
      contents === null ? '' : `/Contents ${contents} 0 R`,
      '>>',
    ].filter(Boolean).join(' ')
  }
  objects[pagesNumber - 1] = `<< /Type /Pages /Kids [${kids.map(number => `${number} 0 R`).join(' ')}] /Count ${kids.length} >>`

  let infoNumber = 0
  if (info) {
    infoNumber = add(`<< /Title (${escapePdfString(info.title)}) /Author (${escapePdfString(info.author)}) >>`)
  }

  const chunks: Buffer[] = []
  let offset = 0
  const write = (value: string) => {
    const bytes = Buffer.from(value, 'latin1')
    chunks.push(bytes)
    offset += bytes.length
  }

  write('%PDF-1.4\n')
  const offsets = objects.map((body, index) => {
    const start = offset
    write(`${index + 1} 0 obj\n${body}\nendobj\n`)
    return start
  })
  const xrefOffset = offset
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const start of offsets) {
    write(`${String(start).padStart(10, '0')} 00000 n \n`)
  }
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${infoNumber ? ` /Info ${infoNumber} 0 R` : ''} >>\nstartxref\n${xrefOffset}\n%%EOF\n`)
  return Buffer.concat(chunks)
}

test('parse_pdf_extracts_page_text', async () => {
  const buffer = buildPdf({
    pages: ['Hello PDF'],
    info: { title: 'Demo PDF', author: 'Jane Doe' },
  })
  const book = await parsePdf(buffer, 'E:\\Books\\demo.pdf')
  assert.equal(book.title, 'Demo PDF')
  assert.equal(book.author, 'Jane Doe')
  assert.equal(book.chapters.length, 1)
  const chapter = book.chapters[0]
  assert.equal(chapter.id, 'c001')
  assert.equal(chapter.title, '第 1 页')
  assert.equal(chapter.page, 1)
  assert.equal(chapter.blocks.length, 1)
  assert.equal(chapter.blocks[0].type, 'p')
  assert.match(chapter.blocks[0].text, /Hello PDF/)
  assert.equal(chapter.chars, chapter.blocks.map(block => block.text).join('\n\n').length)
  assert.equal(book.chars, chapter.chars)
})

test('parse_pdf_without_text_returns_no_chapters', async () => {
  const buffer = buildPdf({ pages: [null] })
  const book = await parsePdf(buffer, join('Books', 'scanned.pdf'))
  assert.deepEqual(book.chapters, [])
  assert.equal(book.chars, 0)
  assert.equal(book.scanOnly, true)
  assert.equal(book.pageCount, 1)
  assert.equal(book.title, 'scanned')
  assert.equal(book.author, '')
})

test('parse_pdf_splits_lines_and_paragraphs', async () => {
  const buffer = buildPdf({
    pages: [[
      { text: 'First line', y: 720 },
      { text: 'Second line', y: 706 },
      { text: 'Next paragraph', y: 678 },
    ]],
  })
  const book = await parsePdf(buffer, 'lines.pdf')
  assert.equal(book.chapters.length, 1)
  const blocks = book.chapters[0].blocks
  assert.deepEqual(blocks, [
    { type: 'p', text: 'First line\nSecond line' },
    { type: 'p', text: 'Next paragraph' },
  ])
  assert.equal(book.chapters[0].chars, 'First line\nSecond line\n\nNext paragraph'.length)
})

test('parse_pdf_numbers_pages_in_reading_order', async () => {
  const buffer = buildPdf({ pages: ['Page One', 'Page Two'] })
  const book = await parsePdf(buffer, 'two-pages.pdf')
  assert.deepEqual(book.chapters.map(chapter => chapter.id), ['c001', 'c002'])
  assert.deepEqual(book.chapters.map(chapter => chapter.page), [1, 2])
  assert.deepEqual(book.chapters.map(chapter => chapter.title), ['第 1 页', '第 2 页'])
  assert.match(book.chapters[0].blocks[0].text, /Page One/)
  assert.match(book.chapters[1].blocks[0].text, /Page Two/)
})

test('parse_pdf_rejects_documents_over_page_limit', async () => {
  const buffer = buildPdf({ pages: Array.from({ length: 2001 }, () => null) })
  await assert.rejects(() => parsePdf(buffer, 'too-many-pages.pdf'), /超过 2000 页上限/)
})
test('parse_pdf_drops_page_numbers_and_running_headers', async () => {
  const buffer = buildPdf({
    pages: [
      [{ text: 'Body one', y: 600 }],
      [{ text: 'My Book', y: 750 }, { text: '2', y: 770 }, { text: 'Body two', y: 600 }],
      [{ text: 'My Book', y: 750 }, { text: '3', y: 770 }, { text: 'Body three', y: 600 }],
      [{ text: 'My Book', y: 750 }, { text: '4', y: 770 }, { text: 'Body four', y: 600 }],
    ],
  })
  const book = await parsePdf(buffer, 'furniture.pdf')
  const texts = book.chapters.map(chapter => chapter.blocks.map(block => block.text).join('\n'))
  assert.match(texts[0], /Body one/)
  for (const text of texts.slice(1)) {
    assert.doesNotMatch(text, /My Book/)
    assert.doesNotMatch(text, /^(?:[234])$/m)
  }
})
test('parse_pdf_reports_reflow_confidence', async () => {
  const clean = await parsePdf(buildPdf({ pages: ['Hello PDF'] }), 'clean.pdf')
  assert.equal(typeof clean.reflowConfidence, 'number')
  assert.ok(clean.reflowConfidence! >= 0.6)
  assert.deepEqual(clean.reflowNotes, ['每页正文偏少，可能是扫描或图片为主'])

  const empty = await parsePdf(buildPdf({ pages: [null] }), 'empty.pdf')
  assert.ok(empty.reflowConfidence! < 0.6)
  assert.ok(empty.reflowNotes!.some(note => note.includes('没有文本')))
})
test('parse_pdf_detects_simple_tables', async () => {
  const buffer = buildPdf({
    pages: [[
      { cells: [{ text: 'Name', x: 72 }, { text: 'Value', x: 320 }], y: 600 },
      { cells: [{ text: 'Alpha', x: 72 }, { text: '1', x: 320 }], y: 580 },
      { text: 'After table', y: 540 },
    ]],
  })
  const book = await parsePdf(buffer, 'table.pdf')
  const blocks = book.chapters[0].blocks
  assert.deepEqual(blocks[0], {
    type: 'table',
    text: 'Name | Value\nAlpha | 1',
    rows: [['Name', 'Value'], ['Alpha', '1']],
  })
  assert.equal(blocks[1].type, 'p')
  assert.match(blocks[1].text, /After table/)
})
