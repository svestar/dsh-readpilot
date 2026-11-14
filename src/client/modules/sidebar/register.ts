import { h } from '../../runtime.ts'
import { NS } from '../../locale/index.ts'
import { SidebarReader } from './SidebarReaderView.ts'
import type { CallRpc, TextFn } from '../../lib/types.ts'

/** Right-pane reader tab: the same book, rendered next to a conversation. */
export function registerSidebar(
  ctx: any,
  t: TextFn,
  call: CallRpc,
  openResource?: (address: string) => void,
): void {
  if (!ctx.sidebarRightTabs) return
  ctx.effect(
    () => ctx.sidebarRightTabs.register({
      id: 'dsh-readpilot.sidebar',
      kind: 'dsh-readpilot',
      patterns: ['dsh-resource://dsh-readpilot/**'],
      title: () => t('sidebarReaderTitle'),
      guide: [{
        id: 'reader',
        title: () => t('sidebarReaderTitle'),
        description: () => t('sidebarReaderHint'),
      }],
      keepMounted: true,
    }),
    'dsh-readpilot: sidebar tab type',
  )
  ctx.effect(
    () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: 'dsh-readpilot.sidebar',
      locale: NS,
    }, (props: any) => h(SidebarReader, { ...props, call, t: props.t ?? t, openResource }))),
    'dsh-readpilot: sidebar tab body',
  )
}
