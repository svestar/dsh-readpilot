import { h } from '../runtime.js'
import { MarkdownMessage } from './markdown.js'

export function ChatBody({
  t,
  workspaceId,
  hasMore,
  loadingEarlier,
  loadEarlier,
  messages,
  sending,
  running,
  chatBodyRef,
}) {
  return h('div', { className: 'dsh-reader-chat-body', ref: chatBodyRef },
    hasMore
      ? h('button', {
        type: 'button',
        className: 'dsh-reader-chat-more',
        disabled: loadingEarlier,
        onClick: () => void loadEarlier(),
      }, loadingEarlier ? t('loading') : t('loadEarlier'))
      : null,
    messages.length === 0
      ? h('div', { className: 'dsh-reader-chat-empty' },
        workspaceId ? t('chatEmpty') : t('chatDisabled'))
      : messages.map(message => h('div', {
        key: message.key,
        className: 'dsh-reader-msg',
        'data-role': message.role,
      },
      h('div', { className: 'dsh-reader-msg-role' },
        message.role === 'user' ? t('you') : t('assistant')),
      message.role === 'assistant'
        ? h(MarkdownMessage, { text: message.text, prefix: message.key })
        : h('div', { className: 'dsh-reader-msg-text' }, message.text))),
    sending || running
      ? h('div', { className: 'dsh-reader-chat-thinking' },
        sending ? t('sending') : t('thinking'))
      : null)
}

export function ChatCompose({
  t,
  workspaceId,
  draft,
  setDraft,
  sending,
  send,
  chatInputRef,
}) {
  return h('div', { className: 'dsh-reader-chat-compose' },
    h('textarea', {
      ref: chatInputRef,
      value: draft,
      rows: 3,
      placeholder: workspaceId ? t('chatPlaceholder') : t('chatDisabled'),
      disabled: !workspaceId,
      onChange: event => setDraft(event.target.value),
      onKeyDown: event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault()
          void send()
        }
      },
    }),
    h('div', { className: 'dsh-reader-chat-compose-row' },
      h('span', { className: 'dsh-reader-chat-hint' }, workspaceId ? 'Enter / Shift+Enter' : ''),
      h('button', {
        type: 'button',
        className: 'dsh-reader-chat-send',
        disabled: !draft.trim() || sending || !workspaceId,
        onClick: () => void send(),
      }, sending ? t('sending') : t('send'))))
}
