import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePdf } from '../src/formats/pdf.js'

function stream(text) {
  const body = `BT\n/F1 24 Tf\n72 720 Td\n(${text}) Tj\nET`
  return `<< /Length ${Buffer.byteLength(body, 'latin1')} >>\nstream\n${body}\nendstream`
}

function buildPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R >>',
    '<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',
    stream('One'),
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 7 0 R >>',
    stream('Two'),
    '<< /Type /Outlines /First 9 0 R /Last 9 0 R /Count 2 >>',
    '<< /Title (Chapter One) /Parent 8 0 R /Dest [4 0 R /XYZ 0 792 0] /First 10 0 R /Last 10 0 R /Count 1 >>',
    '<< /Title (Section A) /Parent 9 0 R /Dest [6 0 R /XYZ 0 792 0] >>',
  ]
  const chunks = []
  let offset = 0
  const write = value => {
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
  const book = await parsePdf(buildPdf(), 'outline.pdf')
  assert.equal(book.chapters.length, 2)
  assert.deepEqual(book.outline.map(item => ({
    title: item.title,
    level: item.level,
    page: item.page,
  })), [
    { title: 'Chapter One', level: 0, page: 1 },
    { title: 'Section A', level: 1, page: 2 },
  ])
})
