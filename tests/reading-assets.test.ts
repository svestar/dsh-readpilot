import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { scanLibrary } from '../src/host/modules/library/book.ts'
import { createReadingService } from '../src/host/modules/reading/service.ts'
import { createLimiter } from '../src/host/lib/limit.ts'
import type { Settings } from '../src/shared/contracts/library.ts'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

async function makeEpubWithCover(filePath: string) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Cover Book</dc:title><dc:creator>Author</dc:creator>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-img" href="cover.png" media-type="image/png"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`)
  zip.file('OEBPS/ch1.xhtml', '<html><body><p>Chapter</p></body></html>')
  zip.file('OEBPS/cover.png', PNG)
  await writeFile(filePath, await zip.generateAsync({ type: 'nodebuffer' }))
}

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

test('cover_reads_epub_and_pdf', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-cover-'))
  const library = join(root, 'books')
  await mkdir(library, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))
  await makeEpubWithCover(join(library, 'cover.epub'))
  await writeFile(join(library, 'page.pdf'), makePdf('Cover PDF'))
  await writeFile(join(library, 'plain.txt'), '第一章 开始\n\n正文', 'utf8')

  const books = await scanLibrary(library)
  const settings: Settings = { libraryDir: library, workspaceId: 'w1' }
  const service = createReadingService({
    dataDir: join(root, 'data'),
    resolveBook: async bookId => {
      const book = books.find(candidate => candidate.id === bookId)
      if (!book) throw new Error(`book not found: ${String(bookId)}`)
      return book
    },
    currentSettings: async () => settings,
  })

  const epub = books.find(book => book.format === 'epub')!
  const pdf = books.find(book => book.format === 'pdf')!
  const txt = books.find(book => book.format === 'txt')!

  const epubCover = await service.cover({ bookId: epub.id })
  assert.equal(epubCover.contentType, 'image/png')
  assert.deepEqual(epubCover.bytes, PNG)

  const pdfCover = await service.cover({ bookId: pdf.id })
  assert.equal(pdfCover.contentType, 'image/png')
  assert.equal(pdfCover.bytes.subarray(0, 4).toString('hex'), '89504e47')

  await assert.rejects(() => service.cover({ bookId: txt.id }), /封面/)
})

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

test('limiter_caps_concurrency', async () => {
  const run = createLimiter(2)
  let active = 0
  let peak = 0
  const gates = [deferred(), deferred(), deferred(), deferred()]
  const tasks = gates.map(gate => run(async () => {
    active += 1
    peak = Math.max(peak, active)
    await gate.promise
    active -= 1
    return true
  }))

  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(peak, 2)
  assert.equal(active, 2)

  for (const gate of gates) gate.resolve()
  assert.deepEqual(await Promise.all(tasks), [true, true, true, true])
  assert.equal(peak, 2)
  assert.equal(active, 0)
})

test('limiter_releases_slot_after_failure', async () => {
  const run = createLimiter(1)
  await assert.rejects(() => run(async () => { throw new Error('boom') }), /boom/)
  assert.equal(await run(async () => 'next'), 'next')
})
