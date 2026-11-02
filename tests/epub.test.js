import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { parseEpub } from '../src/formats/epub.js'

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

const CONTENT_OPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>测试书</dc:title>
    <dc:creator>张三</dc:creator>
    <dc:language>zh-CN</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`

const NAV_XHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>目录</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <ol>
        <li><a href="text/ch1.xhtml">第一章 初见</a></li>
        <li><a href="text/ch2.xhtml#top">第二章 再会</a></li>
      </ol>
    </nav>
  </body>
</html>`

const CHAPTER_ONE = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>第一章</title></head>
  <body>
    <h1>初见的正文标题</h1>
    <div><p>你好，<strong>世界</strong>。</p></div>
    <blockquote><p>引用的句子。</p></blockquote>
    <p>第一行<br/>第二行</p>
    <ul><li>条目一</li><li>条目二</li></ul>
    <pre><code>const x = 1
console.log(x)</code></pre>
  </body>
</html>`

const CHAPTER_TWO = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>第二章</title></head>
  <body>
    <h1>再会的正文标题</h1>
    <p>第二章的正文。</p>
  </body>
</html>`

async function buildEpub() {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('META-INF/container.xml', CONTAINER_XML)
  zip.file('OEBPS/content.opf', CONTENT_OPF)
  zip.file('OEBPS/nav.xhtml', NAV_XHTML)
  zip.file('OEBPS/text/ch1.xhtml', CHAPTER_ONE)
  zip.file('OEBPS/text/ch2.xhtml', CHAPTER_TWO)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('parse_epub_nav_toc', async () => {
  const book = await parseEpub(await buildEpub(), 'E:\\Books\\demo.epub')

  assert.equal(book.title, '测试书')
  assert.equal(book.author, '张三')
  assert.equal(book.chapters.length, 2)
  assert.equal(book.chapters[0].id, 'c001')
  assert.equal(book.chapters[1].id, 'c002')

  assert.equal(book.chapters[0].title, '第一章 初见')
  const blocks = book.chapters[0].blocks
  assert.deepEqual(blocks.map(block => block.type), ['h', 'p', 'quote', 'p', 'li', 'li', 'code'])
  assert.equal(blocks[0].text, '初见的正文标题')
  assert.equal(blocks[0].level, 1)
  assert.equal(blocks[1].text, '你好，世界。')
  assert.equal(blocks[2].text, '引用的句子。')
  assert.equal(blocks[3].text, '第一行\n第二行')
  assert.equal(blocks[6].text, 'const x = 1\nconsole.log(x)')

  assert.equal(book.chapters[1].title, '第二章 再会')
  assert.equal(book.chapters[1].blocks[0].text, '再会的正文标题')
  assert.equal(book.chapters[1].blocks[1].text, '第二章的正文。')

  for (const chapter of book.chapters) {
    assert.ok(chapter.chars > 0)
    assert.equal(chapter.chars, chapter.blocks.map(block => block.text).join('\n\n').length)
  }
  assert.equal(book.chars, book.chapters.reduce((sum, chapter) => sum + chapter.chars, 0))
  assert.ok(book.chars > 0)
})
