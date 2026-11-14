import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import type {
  EpubAssetResult,
  EpubDocumentResult,
  PageViewResult,
} from '../../../shared/contracts/reading.ts'
import type { Settings } from '../../../shared/contracts/library.ts'
import type { Book } from '../library/book.ts'
import { ReaderError } from '../../lib/errors.ts'
import { createLimiter } from '../../lib/limit.ts'
import type { PdfRenderer } from './visual/pdf.ts'
import type { EpubVisual } from './visual/epub/index.ts'

const PDF_COVER_SCALE = 0.5
const MAX_CONCURRENT_COVERS = 4
const MAX_BOOK_IMAGE_BYTES = 20 * 1024 * 1024
const BOOK_IMAGE_TYPES = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.svg', 'image/svg+xml'],
])

export interface ReadingAssetDependencies {
  dataDir: string
  resolveBook(bookId: unknown): Promise<Book>
  currentSettings(): Promise<Settings>
}

export function createReadingAssets({ dataDir, resolveBook, currentSettings }: ReadingAssetDependencies) {
  const coverLimit = createLimiter(MAX_CONCURRENT_COVERS)
  let pdfRendererPromise: Promise<PdfRenderer> | undefined
  let epubVisualPromise: Promise<EpubVisual> | undefined

  async function getPdfRenderer(): Promise<PdfRenderer> {
    if (!pdfRendererPromise) {
      pdfRendererPromise = import('./visual/pdf.ts').then(({ createPdfPageRenderer }) =>
        createPdfPageRenderer({ cacheDir: join(dataDir, 'cache', 'pages') }))
    }
    return pdfRendererPromise
  }

  async function getEpubVisual(): Promise<EpubVisual> {
    if (!epubVisualPromise) {
      epubVisualPromise = import('./visual/epub/index.ts').then(({ createEpubVisual }) =>
        createEpubVisual({ dataDir }))
    }
    return epubVisualPromise
  }

  async function pageView({ bookId, page, scale }: any = {}): Promise<PageViewResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'pdf') throw new ReaderError('not-pdf', '只有 PDF 支持页面渲染')
    const renderer = await getPdfRenderer()
    const result = await renderer.render({ bookId: book.id, filePath: book.path, page, scale })
    return {
      width: result.width,
      height: result.height,
      pageCount: result.pageCount,
      textItems: result.textItems,
    }
  }

  async function pdfPage(payload: any = {}): Promise<{ png: Buffer; contentType: string }> {
    const book = await resolveBook(payload.bookId)
    if (book.format !== 'pdf') throw new ReaderError('not-pdf', '只有 PDF 支持页面渲染')
    const renderer = await getPdfRenderer()
    const result = await renderer.render({
      bookId: book.id,
      filePath: book.path,
      page: payload.page,
      scale: payload.scale,
    })
    return { png: result.png, contentType: 'image/png' }
  }

  async function cover({ bookId }: any = {}): Promise<{ bytes: Buffer; contentType: string }> {
    const book = await resolveBook(bookId)
    return coverLimit(async () => {
      if (book.format === 'epub') {
        const visual = await getEpubVisual()
        const result = await visual.cover({ bookId: book.id, filePath: book.path })
        if (!result) throw new ReaderError('no-cover', '这本书没有封面')
        return { bytes: Buffer.from(result.bytes), contentType: result.contentType }
      }
      if (book.format === 'pdf') {
        const page = await pdfPage({ bookId: book.id, page: 1, scale: PDF_COVER_SCALE })
        return { bytes: page.png, contentType: page.contentType }
      }
      throw new ReaderError('no-cover', '这本书没有封面')
    })
  }

  async function epubDocument({ bookId, href }: any = {}): Promise<EpubDocumentResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'epub') throw new ReaderError('not-epub', '只有 EPUB 支持原书渲染')
    if (typeof href !== 'string' || !href) throw new ReaderError('invalid-href', '缺少 EPUB 章节 href')
    const visual = await getEpubVisual()
    return visual.readDocument({
      bookId: book.id,
      filePath: book.path,
      href,
      assetBase: '/api/dsh-readpilot/epub-asset',
      docBase: '/api/dsh-readpilot/epub-doc',
    })
  }

  async function epubAsset({ bookId, path }: any = {}): Promise<EpubAssetResult> {
    const book = await resolveBook(bookId)
    if (book.format !== 'epub') throw new ReaderError('not-epub', '只有 EPUB 支持原书资源')
    if (typeof path !== 'string' || !path) throw new ReaderError('invalid-path', '缺少 EPUB 资源路径')
    const visual = await getEpubVisual()
    return visual.readAsset({ bookId: book.id, filePath: book.path, path })
  }

  async function bookAsset({ bookId, path }: any = {}): Promise<{ bytes: Buffer; contentType: string }> {
    const book = await resolveBook(bookId)
    if (book.format === 'epub') {
      const result = await epubAsset({ bookId: book.id, path })
      return { bytes: Buffer.from(result.bytes), contentType: result.contentType }
    }
    if (typeof path !== 'string' || !path) throw new ReaderError('invalid-path', '缺少图片路径')
    if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(path)) throw new ReaderError('invalid-path', '图片路径必须是书库内的相对路径')
    const settings = await currentSettings()
    if (!settings.libraryDir) throw new ReaderError('no-library', '还没有配置书库')
    const root = resolve(settings.libraryDir)
    const target = resolve(dirname(book.path), path)
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      throw new ReaderError('invalid-path', '图片路径越界')
    }
    const info = await stat(target)
    if (!info.isFile()) throw new ReaderError('invalid-path', '图片不是文件')
    if (info.size > MAX_BOOK_IMAGE_BYTES) throw new ReaderError('image-too-large', '图片超过大小限制')
    const contentType = BOOK_IMAGE_TYPES.get(extname(target).toLowerCase())
    if (!contentType) throw new ReaderError('unsupported-image', '不支持的图片格式')
    return { bytes: await readFile(target), contentType }
  }

  return { pageView, pdfPage, cover, epubDocument, epubAsset, bookAsset }
}
