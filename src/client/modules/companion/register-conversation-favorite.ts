import { h } from '../../runtime.ts'
import { NS } from '../../locale/index.ts'
import { ConversationFavorite } from './ConversationFavorite.ts'
import type { CallRpc, TextFn } from '../../lib/types.ts'

/** Add one "save as long note" action to every finalized assistant reply. */
export function registerConversationFavorite(ctx: any, t: TextFn, call: CallRpc): void {
  ctx.effect(() => ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'dsh-readpilot.favorite',
    order: 30,
    locale: NS,
  }, (props: any) => h(ConversationFavorite, { ...props, t, call }))), 'dsh-readpilot: conversation favorite')
}
