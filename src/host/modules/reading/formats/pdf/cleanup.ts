import type { PdfLine, PdfPageData } from './types.ts'
import { PAGE_NUMBER_PATTERN, TOC_LEADER_PATTERN } from './types.ts'

function furnitureKey(text: string): string {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Drop page numbers and running headers/footers repeated across pages. */
export function stripPageFurniture(pages: PdfPageData[]): number {
  let removed = 0
  const counts = new Map<string, number>()
  for (const page of pages) {
    if (page.number === 1) continue
    const seen = new Set<string>()
    for (const line of page.lines) {
      const top = line.y > page.height * 0.88
      const bottom = line.y < page.height * 0.12
      if (!top && !bottom) continue
      const key = furnitureKey(line.text ?? '')
      if (!key || seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const threshold = Math.max(3, Math.ceil((pages.length - 1) * 0.5))
  for (const page of pages) {
    if (page.number === 1) continue
    for (const line of page.lines) {
      const top = line.y > page.height * 0.88
      const bottom = line.y < page.height * 0.12
      if (!top && !bottom) continue
      const text = (line.text ?? '').trim()
      if (!text) continue
      if (PAGE_NUMBER_PATTERN.test(text)) {
        line.text = ''
        removed += 1
        continue
      }
      const key = furnitureKey(text)
      if ((counts.get(key) ?? 0) >= threshold && key.length <= 80) {
        line.text = ''
        removed += 1
      }
    }
  }
  return removed
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

export function looksLikeTocPage(lines: PdfLine[]): boolean {
  const text = lines.filter(line => line.text)
  if (text.length < 5) return false
  const entries = text.filter(line => TOC_LEADER_PATTERN.test(line.text ?? '')
    || /^\\d+(?:\\.\\d+)*\\s+.+\\s+\\d{1,4}$/.test(line.text ?? '')).length
  return entries >= text.length * 0.4
}

export function isCodeLine(line: PdfLine): boolean {
  const text = line.text ?? ''
  if (!text) return false
  if (/[\u3400-\u9FFF]/.test(text)) return false
  if (/[。！？；，]/.test(text)) return false
  if (/^(?:\$|#|>|\[[^\]]*\]\s*[$#]|\.{0,2}\/|~\/)/.test(text)) return true
  if (/\s--?[a-zA-Z]/.test(text) && text.length < 160) return true
  const symbols = (text.match(/[^\p{L}\p{N}\s]/gu) ?? []).length
  const ratio = symbols / text.length
  if (line.mono && ratio > 0.1) return true
  return ratio > 0.22 && text.length < 120
}
