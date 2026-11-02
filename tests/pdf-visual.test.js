import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPdfPageRenderer } from '../src/visual/pdf.js'

function makePdf(text) {
  const stream = `BT /F1 24 Tf 100 700 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = []
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
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-pdf-visual-'))
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
  const root = await mkdtemp(join(tmpdir(), 'dsh-reader-pdf-visual-'))
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
