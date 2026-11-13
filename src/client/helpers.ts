import type { ChatMessage, Screen } from './types.ts'

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function pdfChapterIdForPage(screen: Screen, page: number, fallbackChapterId: string): string {
  if (screen.kind !== 'book') return fallbackChapterId
  const entry = screen.detail.toc.find(item => item.page === page)
  if (entry) return entry.id
  const match = /^c(\d+)$/.exec(fallbackChapterId)
  return match ? `c${String(page).padStart(3, '0')}` : fallbackChapterId
}

export function downloadText(fileName: string, text: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !document.body) return
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function formatSize(bytes: unknown): string {
  if (!Number.isFinite(bytes)) return ''
  const value = bytes as number
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function textOfContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

export function foldTranscript(entries: readonly any[] | null | undefined): ChatMessage[] {
  const messages: ChatMessage[] = []
  for (const entry of entries ?? []) {
    if (!entry || entry.type !== 'event' || !entry.event) continue
    const event = entry.event
    if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
    const data = event.data ?? {}
    const message = data.message ?? data
    const source = message.source ?? data.source
    if (event.type === 'user/message' && source && source.kind !== 'user') continue
    const text = textOfContent(message.content ?? data.content)
    if (!text) continue
    messages.push({
      key: `${event.type}-${event.seq ?? messages.length}`,
      role: event.type === 'user/message' ? 'user' : 'assistant',
      text,
    })
  }
  return messages
}

export function timestampOf(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function blockIndexAtOffset(blocks: ReadonlyArray<{ text?: string }> | null | undefined, offset: number): number {
  if (!Array.isArray(blocks) || blocks.length === 0) return 0
  const wanted = Number.isFinite(offset) ? offset : 0
  let start = 0
  let fallback = 0
  for (let index = 0; index < blocks.length; index += 1) {
    const text = typeof blocks[index]?.text === 'string' ? blocks[index].text : ''
    if (wanted < start) break
    fallback = index
    if (wanted <= start + text.length) return index
    start += text.length + 2
  }
  return fallback
}

export * from './settings/reader-preferences.ts'
export * from './settings/chat-width.ts'
export * from './notes/anchors.ts'
export * from './markdown/blocks.ts'
export * from './notes/diff.ts'
