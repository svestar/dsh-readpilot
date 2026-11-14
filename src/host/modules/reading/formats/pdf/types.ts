export interface PdfLineItem {
  text: string
  x: number
  y: number
  size: number
  width: number
  mono: boolean
}

export interface PdfLine {
  y: number
  size: number
  x: number
  endX: number
  items: PdfLineItem[]
  text?: string
  mono: boolean
  cells?: Array<{ text: string; x: number }>
}

export interface PdfPageData {
  number: number
  width: number
  height: number
  lines: PdfLine[]
}

export const MAX_PAGES = 2000
export const LINE_Y_TOLERANCE = 2
// 相邻行基线间距超过约两倍字号时，视为空行分段。
export const PARAGRAPH_GAP_FACTOR = 2
export const PAGE_NUMBER_PATTERN = /^(?:\d{1,4}|第\s*\d+\s*页|\d+\s*\/\s*\d+)$/
export const MONO_FONT_PATTERN = /mono|courier|consolas|menlo|monaco|code/i
export const TOC_LEADER_PATTERN = /(?:\.[ \t]*){4,}|…{3,}/
