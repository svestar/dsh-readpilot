export const CHAT_WIDTH_KEY = 'dsh-readpilot.chat-width'

export const CHAT_WIDTH_DEFAULT = 420
export const CHAT_WIDTH_MIN = 360
export const CHAT_WIDTH_MAX = 640

export function clampChatWidth(value: number, viewportWidth: number): number {
  const numeric = Number.isFinite(value) ? value : CHAT_WIDTH_DEFAULT
  const available = Number.isFinite(viewportWidth)
    ? viewportWidth - 230 - 360
    : CHAT_WIDTH_MAX
  const upper = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, available))
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
