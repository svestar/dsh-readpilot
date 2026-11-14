import { READER_SHORTCUT_DEFAULTS } from './shortcuts.ts'
import { hostShortcutActions, readerShortcutBridge } from './shortcut-bridge.ts'
import type { TextFn } from '../../lib/types.ts'

/** Host-level search / bookmark commands that call into the mounted panel. */
export function registerShortcuts(ctx: any, t: TextFn): void {
  const shortcuts = typeof ctx.get === 'function' ? ctx.get('shortcuts') : undefined
  if (!shortcuts || typeof shortcuts.register !== 'function') return
  for (const item of [
    { action: 'search' as const, id: 'dsh-readpilot.search', labelKey: 'search' as const },
    { action: 'bookmark' as const, id: 'dsh-readpilot.bookmark', labelKey: 'bookmark' as const },
  ]) {
    const command = {
      id: item.id,
      label: () => t(item.labelKey),
      aliases: [item.action],
      defaults: READER_SHORTCUT_DEFAULTS[item.action],
      regions: ['page'],
      modals: [],
      resolve: () => readerShortcutBridge
        ? { status: 'handled' as const, run: readerShortcutBridge[item.action] }
        : { status: 'pass' as const },
    }
    ctx.effect(() => {
      try {
        const dispose = shortcuts.register(command)
        hostShortcutActions.add(item.action)
        return () => {
          hostShortcutActions.delete(item.action)
          dispose()
        }
      } catch (error) {
        console.warn(`dsh-readpilot: shortcut ${item.id} was not registered`, error)
        return () => {}
      }
    }, `dsh-readpilot: shortcut ${item.id}`)
  }
}
