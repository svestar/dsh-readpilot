import { React } from '../../runtime.ts'
import {
  READER_PALETTES,
  readFontSize,
  readGlassBlur,
  readPageLayout,
  readPaletteId,
  readReadingMode,
  readReflowBooks,
  reflowEnabledFor,
  resolveReaderPalette,
  saveFontSize,
  saveGlassBlur,
  savePageLayout,
  savePaletteId,
  saveReadingMode,
  saveReflowBooks,
} from '../../lib/preferences.ts'
import { readerCapabilities } from './paging.ts'
import type { PageLayout, ReaderMode } from './paging.ts'
import type { Screen, TextFn } from '../../lib/types.ts'

/** Reading preferences: persisted locally, scoped to the panel, not the Host. */
export function useReaderPreferences({ screen, t }: { screen: Screen; t: TextFn }) {
  const [readingMode, setReadingMode] = React.useState<ReaderMode>(readReadingMode)
  const [reflowBooks, setReflowBooks] = React.useState<Record<string, boolean>>(readReflowBooks)
  const [pageLayout, setPageLayout] = React.useState<PageLayout>(readPageLayout)
  const [fontSize, setFontSize] = React.useState(readFontSize)
  const [paletteId, setPaletteId] = React.useState<string>(readPaletteId)
  const [glassBlur, setGlassBlur] = React.useState(readGlassBlur)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [tocOpen, setTocOpen] = React.useState(true)
  const [reflowWarning, setReflowWarning] = React.useState('')
  const palette = resolveReaderPalette(paletteId)

  React.useEffect(() => {
    saveGlassBlur(glassBlur)
  }, [glassBlur])

  const changePalette = React.useCallback((id: string) => {
    if (!READER_PALETTES[id]) return
    setPaletteId(id)
    savePaletteId(id)
  }, [])

  React.useEffect(() => {
    saveReadingMode(readingMode)
  }, [readingMode])

  React.useEffect(() => {
    saveFontSize(fontSize)
  }, [fontSize])

  React.useEffect(() => {
    savePageLayout(pageLayout)
  }, [pageLayout])

  const bookId = screen.kind === 'book' ? screen.detail.book.id : null
  React.useEffect(() => {
    setSettingsOpen(false)
  }, [bookId, screen.kind])

  const setBookReflow = React.useCallback((enabled: boolean) => {
    if (!bookId) return
    setReflowBooks(previous => {
      const next = { ...previous, [bookId]: enabled }
      saveReflowBooks(next)
      return next
    })
  }, [bookId])

  const format = screen.kind === 'book' ? screen.detail.book.format : null
  const scanOnly = screen.kind === 'book' ? Boolean(screen.detail.scanOnly) : false
  const supportedFormat = format === 'txt' || format === 'md' || format === 'epub' || format === 'pdf' ? format : null
  const reflowMode = !scanOnly && bookId && supportedFormat ? reflowEnabledFor(reflowBooks, bookId, supportedFormat) : false
  const reflowModeRef = React.useRef(reflowMode)
  reflowModeRef.current = reflowMode
  const capabilities = readerCapabilities(supportedFormat ?? 'txt', reflowMode, scanOnly)
  const isTextFormat = !scanOnly && (supportedFormat === 'txt' || supportedFormat === 'md'
    || (supportedFormat === 'pdf' && reflowMode)
    || (supportedFormat === 'epub' && reflowMode))
  const textLayout: PageLayout = supportedFormat === 'pdf' && reflowMode ? 'single' : pageLayout
  const effectiveMode: ReaderMode = supportedFormat === 'pdf' ? 'paged' : readingMode

  React.useEffect(() => {
    if (screen.kind !== 'book' || screen.detail.book.format !== 'pdf' || !reflowMode) {
      setReflowWarning('')
      return
    }
    const confidence = screen.detail.reflowConfidence
    if (typeof confidence === 'number' && confidence < 0.6) {
      const detail = screen.detail.reflowNotes?.slice(0, 2).join('；')
      setReflowWarning(`${t('reflowLowConfidence')}（${Math.round(confidence * 100)}%）${detail ? `：${detail}` : ''}`)
    } else {
      setReflowWarning('')
    }
  }, [screen, reflowMode, t])

  return {
    readingMode,
    setReadingMode,
    reflowBooks,
    setReflowBooks,
    setBookReflow,
    reflowMode,
    reflowModeRef,
    pageLayout,
    setPageLayout,
    fontSize,
    setFontSize,
    paletteId,
    palette,
    changePalette,
    glassBlur,
    setGlassBlur,
    settingsOpen,
    setSettingsOpen,
    tocOpen,
    setTocOpen,
    reflowWarning,
    setReflowWarning,
    format,
    bookId,
    scanOnly,
    supportedFormat,
    capabilities,
    isTextFormat,
    textLayout,
    effectiveMode,
  }
}

export type ReaderPreferences = ReturnType<typeof useReaderPreferences>
