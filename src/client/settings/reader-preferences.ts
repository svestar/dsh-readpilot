import type { BookFormat } from '../../books/formats.ts'
import type { PageLayout, ReaderMode } from '../paging.ts'

export const READER_PALETTE_KEY = 'dsh-readpilot.palette'
export const READING_MODE_KEY = 'dsh-readpilot.reading-mode'
export const PAGE_LAYOUT_KEY = 'dsh-readpilot.page-layout'
export const COVERS_ENABLED_KEY = 'dsh-readpilot.covers'
export const GLASS_BLUR_KEY = 'dsh-readpilot.glass-blur'
export const DEFAULT_GLASS_BLUR = 25
export const MAX_GLASS_BLUR = 80

/** Clamp a user-provided blur to 0–80 px; missing or invalid values fall back to the default. */
export function normalizeGlassBlur(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_GLASS_BLUR
  const blur = Number(value)
  if (!Number.isFinite(blur)) return DEFAULT_GLASS_BLUR
  return Math.round(Math.min(MAX_GLASS_BLUR, Math.max(0, blur)))
}
export const DEFAULT_READING_MODE: ReaderMode = 'paged'
export const DEFAULT_PAGE_LAYOUT: PageLayout = 'single'

export interface ReaderPalette {
  id: string
  bg: string
  fg: string
  muted: string
  border: string
  selection: string
  highlight: string
}

export const READER_PALETTE_IDS: readonly string[] = ['auto', 'light', 'dark', 'sepia', 'green', 'night', 'glass']

export const READER_PALETTES: Record<string, ReaderPalette> = {
  auto: {
    id: 'auto',
    bg: 'var(--dsw-alias-bg-base)',
    fg: 'var(--dsw-alias-label-primary)',
    muted: 'var(--dsw-alias-label-secondary)',
    border: 'var(--dsw-alias-border-l2)',
    selection: 'rgba(64,128,255,.30)',
    highlight: 'rgba(245,197,66,.35)',
  },
  light: {
    id: 'light',
    bg: '#ffffff',
    fg: '#1f2328',
    muted: '#5b6573',
    border: '#d8dee6',
    selection: 'rgba(64,128,255,.22)',
    highlight: 'rgba(245,197,66,.45)',
  },
  dark: {
    id: 'dark',
    bg: '#1b1b22',
    fg: '#e6e6ea',
    muted: '#a0a0aa',
    border: '#33333d',
    selection: 'rgba(96,160,255,.35)',
    highlight: 'rgba(245,197,66,.35)',
  },
  sepia: {
    id: 'sepia',
    bg: '#f4ecd8',
    fg: '#4b3a2a',
    muted: '#7a6652',
    border: '#d8c9ad',
    selection: 'rgba(180,120,40,.25)',
    highlight: 'rgba(220,170,70,.45)',
  },
  green: {
    id: 'green',
    bg: '#dbe9d5',
    fg: '#1f3a2a',
    muted: '#4f6b58',
    border: '#b9cfae',
    selection: 'rgba(40,120,70,.22)',
    highlight: 'rgba(220,180,60,.45)',
  },
  night: {
    id: 'night',
    bg: '#0b0b0d',
    fg: '#c9c9cf',
    muted: '#7d7d87',
    border: '#24242b',
    selection: 'rgba(90,140,220,.35)',
    highlight: 'rgba(200,160,60,.35)',
  },
  glass: {
    id: 'glass',
    bg: 'var(--dsh-readpilot-surface)',
    fg: 'var(--dsw-alias-label-primary)',
    muted: 'var(--dsw-alias-label-secondary)',
    border: 'var(--dsw-alias-border-l2)',
    selection: 'rgba(64,128,255,.22)',
    highlight: 'rgba(245,197,66,.42)',
  },
}

export function resolveReaderPalette(id: string): ReaderPalette {
  return READER_PALETTES[id] ?? READER_PALETTES.auto
}

export function readPaletteId(): string {
  try {
    const value = window.localStorage.getItem(READER_PALETTE_KEY)
    return typeof value === 'string' && READER_PALETTES[value] ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function savePaletteId(id: string): void {
  try {
    window.localStorage.setItem(READER_PALETTE_KEY, id)
  } catch {
    // Palette persistence is best effort.
  }
}

export function readReadingMode(): ReaderMode {
  try {
    const value = window.localStorage.getItem(READING_MODE_KEY)
    return value === 'scroll' || value === 'paged' ? value : DEFAULT_READING_MODE
  } catch {
    return DEFAULT_READING_MODE
  }
}

export function saveReadingMode(mode: ReaderMode): void {
  try {
    window.localStorage.setItem(READING_MODE_KEY, mode)
  } catch {
    // Reading-mode persistence is best effort.
  }
}

export const REFLOW_BOOKS_KEY = 'dsh-readpilot.reflow-books'

export function readReflowBooks(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REFLOW_BOOKS_KEY) ?? '{}') as Record<string, unknown>
    const books: Record<string, boolean> = {}
    for (const [bookId, enabled] of Object.entries(parsed ?? {})) {
      if (/^[A-Za-z0-9_-]{1,64}$/.test(bookId) && typeof enabled === 'boolean') books[bookId] = enabled
    }
    return books
  } catch {
    return {}
  }
}

export function saveReflowBooks(books: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(REFLOW_BOOKS_KEY, JSON.stringify(books))
  } catch {
    // Per-book reflow persistence is best effort.
  }
}

export function reflowEnabledFor(books: Record<string, boolean>, bookId: string, format: BookFormat): boolean {
  return books[bookId] ?? (format === 'txt' || format === 'md')
}

export const FONT_SIZE_KEY = 'dsh-readpilot.font-size'
export const DEFAULT_FONT_SIZE = 17
export const MIN_FONT_SIZE = 14
export const MAX_FONT_SIZE = 24

export function normalizeFontSize(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_FONT_SIZE
  const size = Number(value)
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.round(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)))
}

export function readFontSize(): number {
  try {
    return normalizeFontSize(window.localStorage.getItem(FONT_SIZE_KEY))
  } catch {
    return DEFAULT_FONT_SIZE
  }
}

export function saveFontSize(value: number): void {
  try {
    window.localStorage.setItem(FONT_SIZE_KEY, String(normalizeFontSize(value)))
  } catch {
    // Font-size persistence is best effort.
  }
}

export function readCoversEnabled(): boolean {
  try {
    return window.localStorage.getItem(COVERS_ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveCoversEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(COVERS_ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    // Cover preference persistence is best effort.
  }
}

export function readGlassBlur(): number {
  try {
    return normalizeGlassBlur(window.localStorage.getItem(GLASS_BLUR_KEY))
  } catch {
    return DEFAULT_GLASS_BLUR
  }
}

export function saveGlassBlur(blur: number): void {
  try {
    window.localStorage.setItem(GLASS_BLUR_KEY, String(normalizeGlassBlur(blur)))
  } catch {
    // Blur preference persistence is best effort.
  }
}

export function readPageLayout(): PageLayout {
  try {
    const value = window.localStorage.getItem(PAGE_LAYOUT_KEY)
    return value === 'single' || value === 'double' ? value : DEFAULT_PAGE_LAYOUT
  } catch {
    return DEFAULT_PAGE_LAYOUT
  }
}

export function savePageLayout(layout: PageLayout): void {
  try {
    window.localStorage.setItem(PAGE_LAYOUT_KEY, layout)
  } catch {
    // Page-layout persistence is best effort.
  }
}

export function paletteCssColors(palette: ReaderPalette): { bg: string; fg: string; selection: string; highlight: string } {
  let css: CSSStyleDeclaration | null = null
  try {
    css = getComputedStyle(document.documentElement)
  } catch {
    css = null
  }
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
  const label = css?.getPropertyValue('--dsw-alias-label-primary').trim() ?? ''
  if (palette.id === 'glass') {
    const base = css?.getPropertyValue('--dsw-alias-bg-base').trim() ?? ''
    return {
      bg: base || (dark ? '#1b1b22' : '#ffffff'),
      fg: label || (dark ? '#e6e6ea' : '#1f2328'),
      selection: palette.selection,
      highlight: palette.highlight,
    }
  }
  if (palette.id !== 'auto') {
    return { bg: palette.bg, fg: palette.fg, selection: palette.selection, highlight: palette.highlight }
  }
  const bg = css?.getPropertyValue('--dsw-alias-bg-base').trim() ?? ''
  return {
    bg: bg || (dark ? '#1b1b22' : '#ffffff'),
    fg: label || (dark ? '#e6e6ea' : '#1f2328'),
    selection: palette.selection,
    highlight: palette.highlight,
  }
}

export function applyPaletteToFrame(frame: HTMLIFrameElement | null | undefined, palette: ReaderPalette): void {
  const doc = frame?.contentDocument
  if (!doc) return
  const colors = paletteCssColors(palette)
  let style = doc.querySelector('style[data-dsh-palette]')
  if (!style) {
    style = doc.createElement('style')
    style.setAttribute('data-dsh-palette', '')
    ;(doc.head ?? doc.documentElement)?.appendChild(style)
  }
  style.textContent = [
    `html,body{background:${colors.bg}!important;color:${colors.fg}!important}`,
    `body :is(p,div,span,li,blockquote,td,th,h1,h2,h3,h4,h5,h6){color:inherit!important}`,
    `::selection{background:${colors.selection}}`,
  ].join('')
}
