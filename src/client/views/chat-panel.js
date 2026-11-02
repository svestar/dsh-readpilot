import { h } from '../runtime.js'

export function ChatPanel({
  t,
  chatOpen,
  chatTab,
  setChatTab,
  setChatOpen,
  notesBody,
  chatBody,
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
}) {
  if (!chatOpen) return null
  return h('aside', { className: 'dsh-reader-chat' },
    h('div', {
      key: 'resizer',
      className: 'dsh-reader-chat-resizer',
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
    h('div', { className: 'dsh-reader-chat-head' },
      h('div', { className: 'dsh-reader-chat-tabs', role: 'tablist' },
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'dsh-reader-chat-tab',
          'data-active': chatTab === 'chat' ? 'true' : 'false',
          'aria-selected': chatTab === 'chat',
          onClick: () => setChatTab('chat'),
        }, t('companion')),
        h('button', {
          type: 'button',
          role: 'tab',
          className: 'dsh-reader-chat-tab',
          'data-active': chatTab === 'notes' ? 'true' : 'false',
          'aria-selected': chatTab === 'notes',
          onClick: () => setChatTab('notes'),
        }, t('marks'))),
      h('button', {
        type: 'button',
        className: 'dsh-reader-chat-close',
        onClick: () => setChatOpen(false),
      }, t('closeChat'))),
    chatTab === 'notes'
      ? notesBody
      : chatBody,
    chatTab === 'chat' && chatError
      ? h('div', { className: 'dsh-reader-chat-error' }, chatError)
      : null,
    chatTab === 'chat' ? chatCompose : null)
}
