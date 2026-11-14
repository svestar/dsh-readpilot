import { h } from '../../runtime.ts'
import { NS } from '../../locale/index.ts'
import { ReaderBooksToolView, ReaderOpenToolView, ReaderSearchToolView } from '../reader/ReaderToolView.ts'
import type { TextFn } from '../../lib/types.ts'

/** First-party tool views for the reader tools. */
export function registerToolViews(ctx: any, t: TextFn, onOpen: (address: string) => void): void {
  ctx.effect(
    () => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
      name: 'tool.call.toolview',
      key: 'reader_books',
      locale: NS,
    }, (props: any) => h(ReaderBooksToolView, { ...props, t: props.t ?? t }))),
    'dsh-readpilot: reader_books tool view',
  )
  ctx.effect(
    () => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
      name: 'tool.call.toolview',
      key: 'reader_search',
      locale: NS,
    }, (props: any) => h(ReaderSearchToolView, { ...props, t: props.t ?? t, onOpen }))),
    'dsh-readpilot: reader_search tool view',
  )
  ctx.effect(
    () => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
      name: 'tool.call.toolview',
      key: 'reader_open',
      locale: NS,
    }, (props: any) => h(ReaderOpenToolView, { ...props, t: props.t ?? t, onOpen }))),
    'dsh-readpilot: reader_open tool view',
  )
}
