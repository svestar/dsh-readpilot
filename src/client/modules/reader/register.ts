import { h } from '../../runtime.ts'
import { NS } from '../../locale/index.ts'
import { createReaderErrorBoundary } from '../common/ErrorBoundary.ts'
import { NativeCompanion, createNativeChatBoundary } from '../companion/NativeCompanion.ts'
import { PanelIcon } from '../library/panels.ts'
import { ReaderPanelView } from './ReaderPanelView.ts'
import type { CallRpc, TextFn } from '../../lib/types.ts'

/** Sidebar entry, main reader panel and the embedded companion occurrence. */
export function registerReader(ctx: any, t: TextFn, call: CallRpc, runtime: any): void {
  const ReaderErrorBoundary = createReaderErrorBoundary()
  const NativeChatBoundary = createNativeChatBoundary()

  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: 'dsh-readpilot',
    order: 20,
    label: () => t('panel'),
    locale: NS,
  }, PanelIcon)), 'dsh-readpilot: sidebar entry')

  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: 'dsh-readpilot',
    locale: NS,
    children: {
      'dsh-readpilot.companion': { kind: 'single', scope: 'session' },
    },
  }, (props: any) => h(ReaderErrorBoundary, null, h(ReaderPanelView, {
    ...props,
    t: props.t ?? t,
    call,
    runtime,
    NativeChatBoundary,
  })))), 'dsh-readpilot: main panel')

  ctx.effect(() => ctx.slots.inject('dsh-readpilot.companion', () => ctx.slots.register({
    name: 'dsh-readpilot.companion',
    locale: NS,
  }, NativeCompanion)), 'dsh-readpilot: native companion')
}
