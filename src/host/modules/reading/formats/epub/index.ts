import { basename, extname, posix } from 'node:path'
import type { Chapter, ParsedBook } from '../../formats.ts'
import { readChapter } from './html.ts'
import { readMetadata } from './meta.ts'
import { readTocTitles } from './toc.ts'
import { CONTAINER_PATH } from './types.ts'
import { findOpfPath, openZip, readManifest, readRequiredText, readSpine } from './zip.ts'
import { parseXml } from './xml.ts'

export async function parseEpub(buffer: Buffer, filePath: string): Promise<ParsedBook> {
  const zip = await openZip(buffer)
  const container = await readRequiredText(zip, CONTAINER_PATH, 'EPUB 缺少 META-INF/container.xml')
  const opfPath = findOpfPath(container)
  const opf = await readRequiredText(zip, opfPath, `EPUB 找不到 OPF 文件：${opfPath}`)
  const packageDoc = parseXml(opf)
  if (!packageDoc.documentElement || localNameOf(packageDoc.documentElement) !== 'package') {
    throw new Error(`EPUB 的 OPF 文件格式无效：${opfPath}`)
  }
  const metadata = readMetadata(packageDoc.documentElement)
  const manifest = readManifest(packageDoc.documentElement, opfPath)
  const spine = readSpine(packageDoc.documentElement, manifest)
  const tocTitles = await readTocTitles(zip, manifest, spine.tocId)
  const fallbackTitle = basename(filePath, extname(filePath)) || '未命名书籍'
  const opfDir = posix.dirname(opfPath)

  const chapters: Chapter[] = []
  for (const item of spine.items) {
    const chapter = await readChapter(zip, item, tocTitles, chapters.length + 1)
    if (!chapter) continue
    chapters.push({
      id: `c${String(chapters.length + 1).padStart(3, '0')}`,
      href: posix.relative(opfDir, item.path),
      ...chapter,
    })
  }

  // A spine item that only contains a short title/cover page is not a logical
  // chapter. Keep its slot for stable ids and old progress anchors, but merge
  // its body into the next content chapter and hide it from the TOC.
  for (let index = 0; index + 1 < chapters.length; index += 1) {
    const chapter = chapters[index]
    const next = chapters[index + 1]
    if (!isTitleOnly(chapter) || next.skip) continue
    const tocTitle = tocTitles.get(chapter.href ? posix.join(opfDir, chapter.href) : '')
    chapter.skip = true
    chapter.chars = 0
    // Keep the title page blocks available for old note anchors, but the
    // reading chapter is the following content page.
    next.blocks = [...chapter.blocks, ...next.blocks]
    next.chars = chapterChars(next.blocks)
    if (tocTitle && !/^(封面|cover|title\s*page|titlepage|目录|contents)$/i.test(tocTitle.trim())) {
      next.title = tocTitle
    }
  }

  return {
    title: metadata.title || fallbackTitle,
    author: metadata.author,
    chapters,
    chars: chapters.reduce((sum, chapter) => sum + chapter.chars, 0),
  }
}

function localNameOf(element: any): string {
  const name = element.localName || element.tagName || ''
  return name.slice(name.indexOf(':') + 1).toLowerCase()
}

function isTitleOnly(chapter: Chapter): boolean {
  if (!chapter || chapter.chars > 60) return false
  return !chapter.blocks.some(block => block.type === 'p' && block.text.length > 40)
}

function chapterChars(blocks: Chapter['blocks']): number {
  return blocks.map(block => block.text).join('\n\n').length
}
