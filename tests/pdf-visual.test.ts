import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPdfPageRenderer } from '../src/visual/pdf.ts'
import { parsePdf } from '../src/formats/pdf.ts'
import { visualForChapter } from '../src/client/reader-screen.ts'

function makePdf(text: string) {
  const stream = `BT /F1 24 Tf 100 700 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'binary')
}

test('render_pdf_page_png', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-pdf-visual-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const filePath = join(root, 'hello.pdf')
  await writeFile(filePath, makePdf('Hello PDF'))
  const renderer = createPdfPageRenderer({ cacheDir: join(root, 'cache') })

  const page = await renderer.render({ bookId: 'book1', filePath, page: 1, scale: 1 })
  assert.equal(page.png.subarray(0, 4).toString('hex'), '89504e47')
  assert.ok(page.width > 0 && page.height > 0)
  assert.equal(page.pageCount, 1)
  assert.ok(page.textItems.some(item => item.text.includes('Hello PDF')))

  const pngPath = join(root, 'cache', 'book1', '1@1.png')
  const first = await stat(pngPath)
  const again = await renderer.render({ bookId: 'book1', filePath, page: 1, scale: 1 })
  const second = await stat(pngPath)
  assert.equal(again.pageCount, 1)
  assert.equal(second.mtimeMs, first.mtimeMs)
  assert.deepEqual(await readFile(pngPath), page.png)
})

test('pdf_page_rejects_out_of_range', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-pdf-visual-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const filePath = join(root, 'hello.pdf')
  await writeFile(filePath, makePdf('Hello PDF'))
  const renderer = createPdfPageRenderer({ cacheDir: join(root, 'cache') })

  await assert.rejects(
    () => renderer.render({ bookId: 'book1', filePath, page: 2, scale: 1 }),
    /exceeds page count/,
  )
  await assert.rejects(
    () => renderer.render({ bookId: 'book1', filePath, page: 1, scale: 4 }),
    /scale must be/,
  )
})

function outlineStream(text: string) {
  const body = `BT\n/F1 24 Tf\n72 720 Td\n(${text}) Tj\nET`
  return `<< /Length ${Buffer.byteLength(body, 'latin1')} >>\nstream\n${body}\nendstream`
}

function buildOutlinePdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R >>',
    '<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
    outlineStream('One'),
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 7 0 R >>',
    outlineStream('Two'),
    '<< /Type /Outlines /First 9 0 R /Last 9 0 R /Count 2 >>',
    '<< /Title (Chapter One) /Parent 8 0 R /Dest [4 0 R /XYZ 0 792 0] /First 10 0 R /Last 10 0 R /Count 1 >>',
    '<< /Title (Section A) /Parent 9 0 R /Dest [6 0 R /XYZ 0 792 0] >>',
  ]
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
  const xref = offset
  write(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const start of offsets) write(`${String(start).padStart(10, '0')} 00000 n \n`)
  write(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return Buffer.concat(chunks)
}

test('parse_pdf_outline_hierarchy', async () => {
  const book = await parsePdf(buildOutlinePdf(), 'outline.pdf')
  assert.equal(book.chapters.length, 2)
  assert.deepEqual((book.outline ?? []).map(item => ({
    title: item.title,
    level: item.level,
    page: item.page,
  })), [
    { title: 'Chapter One', level: 0, page: 1 },
    { title: 'Section A', level: 1, page: 2 },
  ])
})

test('visual_target_restores_pdf_page', () => {
  const detail = {
    book: { format: 'pdf' },
    toc: [{ id: 'c1', title: '第一章', page: 12 }, { id: 'c2', title: '无页码' }],
  } as any
  assert.deepEqual(visualForChapter(detail, 'c1'), { kind: 'pdf', page: 12, scale: 1.5 })
  assert.deepEqual(visualForChapter(detail, 'c2'), { kind: 'pdf', page: 1, scale: 1.5 })
  assert.equal(visualForChapter(detail, 'missing'), null)
  assert.equal(visualForChapter({ ...detail, book: { format: 'txt' } }, 'c1'), null)
})
