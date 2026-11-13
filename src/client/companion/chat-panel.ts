import { React, h } from '../common/runtime.ts'
import type { StateSetter } from '../common/runtime.ts'
import { linkifyPageReferences } from '../reader/page-jump.ts'
import type { TextFn } from '../common/types.ts'

/** Assistant streaming mutates text on every token; scan at a readable cadence. */
const LINKIFY_DEBOUNCE_MS = 120

interface ChatPanelProps {
  t: TextFn
  chatOpen: boolean
  chatTab: string
  setChatTab: StateSetter<string>
  setChatOpen: StateSetter<boolean>
  notesBody: any
  longNotesBody: any
  memoryBody: any
  chatBody: any
  nativeChat?: any
  onPageJump?: ((page: number) => void) | null
  chatError: string
  chatCompose: any
  chatWidth: number
  minWidth: number
  maxWidth: number
  startResize: (event: any) => void
  moveResize: (event: any) => void
  endResize: (event: any) => void
  resetResize: () => void
  resizeKeyDown: (event: any) => void
}

export function ChatPanel({
  t,
  chatOpen,
  chatTab,
  setChatTab,
  setChatOpen,
  notesBody,
  longNotesBody,
  memoryBody,
  chatBody,
  nativeChat,
  onPageJump,
  chatError,
  chatCompose,
  chatWidth,
  minWidth,
  maxWidth,
  startResize,
  moveResize,
  endResize,
  resetResize,
  resizeKeyDown,
}: ChatPanelProps) {
  const panelRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!chatOpen || !onPageJump) return
    const panel = panelRef.current
    if (!panel) return
    let timer = 0
    const process = () => {
      timer = 0
      panel.querySelectorAll<HTMLElement>('.dsh-readpilot-chat-body, .dsh-readpilot-native-chat')
        .forEach(root => linkifyPageReferences(root, onPageJump))
    }
    const schedule = () => {
      if (!timer) timer = window.setTimeout(process, LINKIFY_DEBOUNCE_MS)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(panel, { childList: true, subtree: true, characterData: true })
    schedule()
    return () => {
      observer.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [chatOpen, chatTab, onPageJump])

  if (!chatOpen) return null
  return h('aside', { className: 'dsh-readpilot-chat', ref: panelRef },
    h('div', {
      key: 'resizer',
      className: 'dsh-readpilot-chat-resizer',
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': t('resizeChat'),
      'aria-valuemin': minWidth,
      'aria-valuemax': maxWidth,
      'aria-valuenow': chatWidth,
      tabIndex: 0,
      onPointerDown: startResize,
      onPointerMove: moveResize,
      onPointerUp: endResize,
      onPointerCancel: endResize,
      onDoubleClick: resetResize,
      onKeyDown: resizeKeyDown,
    }),
    h('div', { className: 'dsh-readpilot-chat-head' },
      h('div', { className: 'dsh-readpilot-chat-tabs', role: 'tablist' },
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'dsh-readpilot-chat-tab',
          'data-active': chatTab === 'chat' ? 'true' : 'false',
          'aria-selected': chatTab === 'chat',
          onClick: () => setChatTab('chat'),
        }, t('companion')),
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'dsh-readpilot-chat-tab',
          'data-active': chatTab === 'notes' ? 'true' : 'false',
          'aria-selected': chatTab === 'notes',
          onClick: () => setChatTab('notes'),
        }, t('notes')),
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'dsh-readpilot-chat-tab',
          'data-active': chatTab === 'long' ? 'true' : 'false',
          'aria-selected': chatTab === 'long',
          onClick: () => setChatTab('long'),
        }, t('longNotes')),
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'dsh-readpilot-chat-tab',
          'data-active': chatTab === 'memory' ? 'true' : 'false',
          'aria-selected': chatTab === 'memory',
          onClick: () => setChatTab('memory'),
        }, t('memory'))),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-close',
        onClick: () => setChatOpen(false),
      }, t('closeChat'))),
    chatTab === 'notes'
      ? notesBody
      : chatTab === 'long'
        ? longNotesBody
        : chatTab === 'memory'
          ? memoryBody
          : nativeChat
            ? h('div', { className: 'dsh-readpilot-native-chat' }, nativeChat)
            : chatBody,
    chatTab === 'chat' && chatError
      ? h('div', { className: 'dsh-readpilot-chat-error' }, chatError)
      : null,
    chatTab === 'chat' && !nativeChat ? chatCompose : null)
}
