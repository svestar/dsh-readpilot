export const CHAT_WIDTH_KEY = 'dsh-readpilot.chat-width'

export const CHAT_WIDTH_DEFAULT = 420
export const CHAT_WIDTH_MIN = 360

/** 阅读页左侧目录栏宽度，与 `.dsh-readpilot-book` 网格列宽一致。 */
const TOC_COLUMN_WIDTH = 230
/** 伴读栏拉宽时仍保留给主阅读区的最小宽度。 */
const READER_MIN_WIDTH = 360

/** 伴读栏在当前视口下可拖到的最大宽度：只受目录与正文所需空间约束。 */
export function chatWidthLimit(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth)) return CHAT_WIDTH_DEFAULT
  return Math.max(CHAT_WIDTH_MIN, Math.round(viewportWidth - TOC_COLUMN_WIDTH - READER_MIN_WIDTH))
}

export function clampChatWidth(value: number, viewportWidth: number): number {
  const numeric = Number.isFinite(value) ? value : CHAT_WIDTH_DEFAULT
  const upper = chatWidthLimit(viewportWidth)
  return Math.round(Math.min(Math.max(numeric, CHAT_WIDTH_MIN), upper))
}

export function readChatWidth(): number {
  let stored = CHAT_WIDTH_DEFAULT
  try {
    const raw = window.localStorage.getItem(CHAT_WIDTH_KEY)
    if (raw !== null && Number.isFinite(Number(raw))) stored = Number(raw)
  } catch {
    // A browser with storage disabled keeps the default width.
  }
  return clampChatWidth(stored, window.innerWidth > 1100 ? window.innerWidth : 1440)
}

export function saveChatWidth(width: number): void {
  try {
    window.localStorage.setItem(CHAT_WIDTH_KEY, String(width))
  } catch {
    // Width persistence is best effort.
  }
}
