import { React, h } from '../../runtime.ts'
import { TRANSLATION_TARGETS } from '../../lib/translation-preferences.ts'
import type { TextFn } from '../../lib/types.ts'
import type { useReaderTranslation } from './use-reader-translation.ts'

interface TranslationControlProps {
  t: TextFn
  state: ReturnType<typeof useReaderTranslation>
  settingsOnly?: boolean
}

/** Compact bilingual toggle and its small settings popover. */
export function TranslationControl({ t, state, settingsOnly = false }: TranslationControlProps) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return h('div', {
    ref: rootRef,
    className: 'dsh-readpilot-translation-control',
  },
  h('button', {
    type: 'button',
    className: 'dsh-readpilot-translation-toggle',
    'data-active': !settingsOnly && state.enabled ? 'true' : 'false',
    'aria-pressed': settingsOnly ? undefined : state.enabled,
    title: settingsOnly ? t('translationSettings') : t('translationHint'),
    onClick: settingsOnly ? () => setOpen(value => !value) : state.toggleEnabled,
  }, settingsOnly ? t('translationShort') : state.pending ? `${t('translationShort')}…` : t('translationShort')),
  h('button', {
    type: 'button',
    className: 'dsh-readpilot-translation-more',
    'aria-label': t('translationSettings'),
    'aria-expanded': open,
    onClick: () => setOpen(value => !value),
  }, '▾'),
  open
    ? h('div', { className: 'dsh-readpilot-translation-popover', role: 'dialog' },
      h('label', null,
        h('span', null, t('translationTarget')),
        h('select', {
          value: state.targetLanguage,
          onChange: (event: any) => state.setTargetLanguage(event.target.value),
        }, TRANSLATION_TARGETS.map(target => h('option', { key: target.id, value: target.id }, target.label)))),
      h('label', null,
        h('span', null, t('translationProvider')),
        h('select', {
          value: state.provider,
          onChange: (event: any) => state.setProvider(event.target.value),
        },
        state.providers.providers.length
          ? state.providers.providers.map(provider => h('option', { key: provider.id, value: provider.id },
            `${provider.name}${provider.paid ? ` · ${t('translationPaid')}` : ''}`))
          : h('option', { value: state.provider }, state.provider))),
      state.noticeAcknowledged
        ? null
        : h('div', { className: 'dsh-readpilot-translation-notice' },
          h('span', null, t('translationNotice')),
          h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump',
            onClick: state.acknowledgeNotice,
          }, t('translationNoticeOk'))),
      state.panelError ? h('div', { className: 'dsh-readpilot-chat-error' }, state.panelError) : null,
      h('div', { className: 'dsh-readpilot-translation-popover-actions' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-note-jump',
          onClick: () => void state.clearCache(),
        }, t('translationClearCache'))))
    : null)
}
