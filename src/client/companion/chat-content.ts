import { h } from '../common/runtime.ts'
import { DshMarkdown } from '../markdown/dsh-markdown.ts'
import type { StateSetter } from '../common/runtime.ts'
import type { ChatMessage, MutableRef, TextFn } from '../common/types.ts'

interface ChatBodyProps {
  t: TextFn
  workspaceId: string | null
  hasMore: boolean
  loadingEarlier: boolean
  loadEarlier: () => Promise<void> | void
  messages: ChatMessage[]
  sending: boolean
  running: boolean
  chatBodyRef: MutableRef<HTMLDivElement | null>
}

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
}: ChatBodyProps) {
  return h('div', { className: 'dsh-readpilot-chat-body', ref: chatBodyRef },
    hasMore
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-more',
        disabled: loadingEarlier,
        onClick: () => void loadEarlier(),
      }, loadingEarlier ? t('loading') : t('loadEarlier'))
      : null,
    messages.length === 0
      ? h('div', { className: 'dsh-readpilot-chat-empty' },
        workspaceId ? t('chatEmpty') : t('chatDisabled'))
      : messages.map(message => h('div', {
        key: message.key,
        className: 'dsh-readpilot-msg',
        'data-role': message.role,
      },
      h('div', { className: 'dsh-readpilot-msg-role' },
        message.role === 'user' ? t('you') : t('assistant')),
      message.role === 'assistant'
        ? h(DshMarkdown, { t, text: message.text, prefix: message.key })
        : h('div', { className: 'dsh-readpilot-msg-text' }, message.text))),
    sending || running
      ? h('div', { className: 'dsh-readpilot-chat-thinking' },
        sending ? t('sending') : t('thinking'))
      : null)
}

interface ChatComposeProps {
  t: TextFn
  workspaceId: string | null
  draft: string
  setDraft: StateSetter<string>
  sending: boolean
  send: () => Promise<void>
  chatInputRef: MutableRef<HTMLTextAreaElement | null>
}

export function ChatCompose({
  t,
  workspaceId,
  draft,
  setDraft,
  sending,
  send,
  chatInputRef,
}: ChatComposeProps) {
  return h('div', { className: 'dsh-readpilot-chat-compose' },
    h('textarea', {
      ref: chatInputRef,
      value: draft,
      rows: 3,
      placeholder: workspaceId ? t('chatPlaceholder') : t('chatDisabled'),
      disabled: !workspaceId,
      onChange: (event: any) => setDraft(event.target.value),
      onKeyDown: (event: any) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault()
          void send()
        }
      },
    }),
    h('div', { className: 'dsh-readpilot-chat-compose-row' },
      h('span', { className: 'dsh-readpilot-chat-hint' }, workspaceId ? 'Enter / Shift+Enter' : ''),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-chat-send',
        disabled: !draft.trim() || sending || !workspaceId,
        onClick: () => void send(),
      }, sending ? t('sending') : t('send'))))
}
