import { basename, extname } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pdfWasmUrl } from '../../visual/pdfjs.ts'
import type { Chapter, ParsedBook } from '../../formats.ts'
import { pageBlocks } from './blocks.ts'
import { looksLikeTocPage, stripPageFurniture } from './cleanup.ts'
import { collectItems, groupLines, orderColumns } from './lines.ts'
import { metadataText, readOutline } from './outline.ts'
import type { PdfPageData } from './types.ts'
import { MAX_PAGES } from './types.ts'

export async function parsePdf(buffer: Buffer, filePath: string): Promise<ParsedBook> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
    isEvalSupported: false,
    disableFontFace: true,
    wasmUrl: pdfWasmUrl(),
    verbosity: 0,
  } as any)

  try {
    const pdf = await loadingTask.promise
    if (pdf.numPages > MAX_PAGES) {
      throw new Error(`PDF 页数超过 ${MAX_PAGES} 页上限（共 ${pdf.numPages} 页）`)
    }
    const metadata: any = await pdf.getMetadata()
    const info = metadata?.info ?? {}
    const title = metadataText(info.Title) || basename(filePath, extname(filePath))
    const author = metadataText(info.Author)
    const outline = await readOutline(pdf)
    const pages: PdfPageData[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const view = page.view ?? [0, 0, 612, 792]
      const width = Math.max(1, Math.abs(view[2] - view[0]))
      const height = Math.max(1, Math.abs(view[3] - view[1]))
      const content = await page.getTextContent()
      const lines = groupLines(collectItems(content))
      if (lines.length === 0) continue
      pages.push({ number: pageNumber, width, height, lines })
    }

    const removedFurniture = stripPageFurniture(pages)
    const chapters: Chapter[] = []
    let tocPages = 0
    for (const page of pages) {
      if (looksLikeTocPage(page.lines)) {
        tocPages += 1
        continue
      }
      const blocks = pageBlocks(orderColumns(page.lines, page.width))
      if (blocks.length === 0) continue
      chapters.push({
        id: `c${String(chapters.length + 1).padStart(3, '0')}`,
        title: `第 ${page.number} 页`,
        page: page.number,
        blocks,
        chars: blocks.map(block => block.text).join('\n\n').length,
      })
    }

    const totalChars = chapters.reduce((sum, chapter) => sum + chapter.chars, 0)
    const codeChars = chapters.reduce((sum, chapter) => sum + chapter.blocks
      .filter(block => block.type === 'code')
      .reduce((inner, block) => inner + block.text.length, 0), 0)
    const text = chapters.flatMap(chapter => chapter.blocks.map(block => block.text)).join('\n')
    const replacement = (text.match(/\uFFFD/g) ?? []).length
    const coverage = pdf.numPages > 0 ? pages.length / pdf.numPages : 1
    const average = pages.length > 0 ? totalChars / pages.length : 0
    let confidence = 1
    const notes: string[] = []
    if (coverage < 0.9) {
      confidence -= Math.min(0.35, (1 - coverage) * 1.2)
      notes.push('部分页面没有文本，重排可能缺页')
    }
    if (average < 200) {
      confidence -= 0.2
      notes.push('每页正文偏少，可能是扫描或图片为主')
    }
    if (tocPages > pdf.numPages * 0.2) {
      confidence -= 0.1
      notes.push('目录页较多，已按目录跳过')
    }
    if (totalChars > 0 && codeChars / totalChars > 0.6) {
      confidence -= 0.15
      notes.push('代码占比高，正文可能被误判为代码')
    }
    if (totalChars > 0 && replacement / totalChars > 0.002) {
      confidence -= 0.3
      notes.push('存在乱码字符，文本层可能损坏')
    }
    if (removedFurniture > pdf.numPages * 3) {
      confidence -= 0.05
      notes.push('页眉页脚较多，已自动过滤')
    }

    return {
      title,
      author,
      chapters,
      outline,
      pageCount: pdf.numPages,
      scanOnly: chapters.length === 0,
      chars: chapters.reduce((sum, chapter) => sum + chapter.chars, 0),
      reflowConfidence: Math.max(0, Math.min(1, confidence)),
      reflowNotes: notes,
    }
  } finally {
    await loadingTask.destroy()
  }
}
