import { bindRuntime } from './runtime.ts'
import { createRpc } from './lib/rpc.ts'
import {
  DEFAULT_GLASS_BLUR,
  READER_PALETTE_IDS,
  READER_PALETTES,
  clampChatWidth,
  foldTranscript,
  normalizeGlassBlur,
  resolveReaderPalette,
} from './lib/helpers.ts'
import { diffLines } from './modules/notes/diff.ts'
import { findNoteOccurrence } from './modules/notes/anchors.ts'
import { NativeCompanion } from './modules/companion/NativeCompanion.ts'
import { syncCompanionSessionTitles } from './modules/companion/session-title.ts'
import { registerReader } from './modules/reader/register.ts'
import { registerResources } from './modules/reader/register-resources.ts'
import { registerShortcuts } from './modules/reader/register-shortcuts.ts'
import { registerSidebar } from './modules/sidebar/register.ts'
import { registerToolViews } from './modules/toolview/register.ts'
import { NS, en, zh } from './locale/index.ts'
import { CSS } from './styles/index.ts'
import { parseMarkdownBlocks } from '../shared/markdown.ts'
import type { TextFn } from './types.ts'
import type { CallRpc } from './types.ts'

export function createPlugin(require: (name: string) => any) {
  bindRuntime(require)
  let runtime: any
  let boundText: TextFn = key => key

  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-readpilot'
  style.dataset.pluginCss = 'dsh-readpilot/reader.css'
  style.textContent = CSS
  document.head.appendChild(style)

  const call: CallRpc = createRpc('/api/dsh-readpilot', () => Boolean(runtime?.connection))

  return {
    name: 'dsh-readpilot-client',
    inject: ['slots', 'layout', 'locale', 'connection', 'sessions', 'uiWorkspace', 'sidebarRightTabs', 'sidebarRight'],
    foldTranscript,
    clampChatWidth,
    parseMarkdownBlocks,
    diffLines,
    NativeCompanion,
    READER_PALETTE_IDS,
    READER_PALETTES,
    resolveReaderPalette,
    normalizeGlassBlur,
    DEFAULT_GLASS_BLUR,
    findNoteOccurrence,
    apply(ctx: any) {
      runtime = ctx
      boundText = ctx.locale.bind(NS)
      void (async () => {
        try {
          const value = await call('state')
          await syncCompanionSessionTitles(runtime, value.books ?? [], value.sessions ?? {})
        } catch {
          // Session titles are best effort; reader open retries.
        }
      })()
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-readpilot: dictionaries')
      registerShortcuts(ctx, boundText)
      const navigation = registerResources(ctx, call)
      registerReader(ctx, boundText, call, runtime)
      registerSidebar(ctx, boundText, call, navigation.openReaderResource)
      registerToolViews(ctx, boundText, navigation.openReaderTargetFromAddress)
    },
  }
}
