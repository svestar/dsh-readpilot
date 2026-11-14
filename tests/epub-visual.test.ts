import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { createEpubVisual } from '../src/host/modules/reading/visual/epub/index.ts'
import { visualForChapter } from '../src/client/modules/reader/screen.ts'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

async function makeEpub(filePath: string) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title><dc:creator>Test Author</dc:creator><meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="img" href="pic.png" media-type="image/png"/><item id="cover-img" href="cover.png" media-type="image/png"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`)
  zip.file('OEBPS/ch1.xhtml', `<!DOCTYPE html>
<html><head><link rel="stylesheet" href="style.css"/></head>
<body><script>alert(1)</script><h1 onclick="x()">Chapter</h1>
<p><img src="pic.png"/></p><p><a href="ch1.xhtml#part">part</a></p><p style="color:red">styled</p></body></html>`)
  zip.file('OEBPS/style.css', 'body{background:url(pic.png)} .remote{background:url(https://evil.example/x.png)}')
  zip.file('OEBPS/pic.png', PNG)
  zip.file('OEBPS/cover.png', PNG)
  await writeFile(filePath, await zip.generateAsync({ type: 'nodebuffer' }))
}

test('epub_visual_prepare_spine', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-epub-visual-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const filePath = join(root, 'book.epub')
  await makeEpub(filePath)
  const visual = createEpubVisual({ dataDir: join(root, 'data') })

  const meta = await visual.prepare({ bookId: 'book1', filePath })
  assert.equal(meta.title, 'Test Book')
  assert.equal(meta.author, 'Test Author')
  assert.equal(meta.spine.length, 1)
  assert.equal(meta.spine[0].href, 'ch1.xhtml')
})

test('epub_visual_sanitizes_document', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-epub-visual-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const filePath = join(root, 'book.epub')
  await makeEpub(filePath)
  const visual = createEpubVisual({ dataDir: join(root, 'data') })

  const doc = await visual.readDocument({
    bookId: 'book1',
    filePath,
    href: 'ch1.xhtml',
    assetBase: '/api/x/asset',
    docBase: '/api/x/doc',
  })
  assert.equal(doc.contentType, 'text/html; charset=utf-8')
  assert.ok(!doc.html.includes('<script'))
  assert.ok(!doc.html.includes('onclick'))
  assert.ok(doc.html.includes('/api/x/asset?bookId=book1'))
  assert.ok(doc.html.includes('path=OEBPS%2Fpic.png'))
  assert.ok(doc.html.includes('/api/x/doc?bookId=book1'))
  assert.ok(doc.html.includes('href=ch1.xhtml'))
})

test('epub_visual_asset_urls_and_path_guard', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-epub-visual-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const filePath = join(root, 'book.epub')
  await makeEpub(filePath)
  const visual = createEpubVisual({ dataDir: join(root, 'data') })

  const css = await visual.readAsset({ bookId: 'book1', filePath, path: 'OEBPS/style.css' })
  assert.equal(css.contentType, 'text/css; charset=utf-8')
  const cssText = new TextDecoder().decode(css.bytes)
  assert.ok(cssText.includes('/api/dsh-readpilot/epub-asset?bookId=book1'))
  assert.ok(cssText.includes('path=OEBPS%2Fpic.png'))
  assert.ok(cssText.includes('url("")'))

  const image = await visual.readAsset({ bookId: 'book1', filePath, path: 'OEBPS/pic.png' })
  assert.equal(image.contentType, 'image/png')
  assert.deepEqual(image.bytes, PNG)

  await assert.rejects(
    () => visual.readAsset({ bookId: 'book1', filePath, path: '../secret.txt' }),
    /invalid EPUB path|escapes/,
  )
})

test('visual_target_restores_epub_frame', () => {
  const detail = {
    book: { format: 'epub' },
    toc: [{ id: 'e1', title: '一章', href: 'text/ch1.xhtml' }, { id: 'e2', title: '无链接' }],
  } as any
  assert.deepEqual(visualForChapter(detail, 'e1'), { kind: 'epub', href: 'text/ch1.xhtml' })
  assert.equal(visualForChapter(detail, 'e2'), null)
  assert.equal(visualForChapter(detail, undefined), null)
})
test('epub_cover_reads_cover_image', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-readpilot-epub-visual-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const filePath = join(root, 'book.epub')
  await makeEpub(filePath)
  const visual = createEpubVisual({ dataDir: join(root, 'data') })
  const meta = await visual.prepare({ bookId: 'book1', filePath })
  assert.equal(meta.coverPath, 'OEBPS/cover.png')
  const cover = await visual.cover({ bookId: 'book1', filePath })
  assert.equal(cover?.contentType, 'image/png')
  assert.deepEqual(cover?.bytes, PNG)
})
test('visual_target_reflow_flags', () => {
  const detail = {
    book: { format: 'epub' },
    toc: [{ id: 'e1', title: '一章', href: 'text/ch1.xhtml' }],
  } as any
  assert.deepEqual(visualForChapter(detail, 'e1'), { kind: 'epub', href: 'text/ch1.xhtml' })
  assert.equal(visualForChapter(detail, 'e1', true), null)
  const pdf = { book: { format: 'pdf' }, toc: [{ id: 'p1', page: 3 }] } as any
  assert.deepEqual(visualForChapter(pdf, 'p1'), { kind: 'pdf', page: 3, scale: 1.5 })
  assert.equal(visualForChapter(pdf, 'p1', true), null)
})
