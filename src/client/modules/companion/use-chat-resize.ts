import { React } from '../../runtime.ts'
import { CHAT_WIDTH_DEFAULT, clampChatWidth, readChatWidth, saveChatWidth } from '../../lib/helpers.ts'

/** Companion panel width: persisted, clamped to the viewport and drag-resizable. */
export function useChatResize() {
  const [chatWidth, setChatWidth] = React.useState<number>(readChatWidth)
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null)
  const chatWidthRef = React.useRef(chatWidth)
  chatWidthRef.current = chatWidth

  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1100) {
        setChatWidth(current => clampChatWidth(current, window.innerWidth))
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startResize = React.useCallback((event: any) => {
    if (event.button !== 0) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is an optimization; dragging still works without it.
    }
    dragRef.current = { startX: event.clientX, startWidth: chatWidth }
  }, [chatWidth])

  const moveResize = React.useCallback((event: any) => {
    const drag = dragRef.current
    if (!drag) return
    const next = clampChatWidth(drag.startWidth - (event.clientX - drag.startX), window.innerWidth)
    setChatWidth(next)
  }, [])

  const endResize = React.useCallback((event: any) => {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // The pointer may already be released.
    }
    saveChatWidth(chatWidthRef.current)
  }, [])

  const resetResize = React.useCallback(() => {
    setChatWidth(CHAT_WIDTH_DEFAULT)
    saveChatWidth(CHAT_WIDTH_DEFAULT)
  }, [])

  const resizeKeyDown = React.useCallback((event: any) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowLeft' ? 24 : -24
    const next = clampChatWidth(chatWidthRef.current + delta, window.innerWidth)
    setChatWidth(next)
    saveChatWidth(next)
  }, [])

  return { chatWidth, startResize, moveResize, endResize, resetResize, resizeKeyDown }
}
