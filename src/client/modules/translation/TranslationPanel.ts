import { React, h } from '../../runtime.ts'
import { TRANSLATION_TARGETS } from '../../lib/translation-preferences.ts'
import type { ChapterContent } from '../../../shared/contracts/reading.ts'
import type { TextFn } from '../../lib/types.ts'
import type { BlockTranslation, TranslationBlockView, useReaderTranslation } from './use-reader-translation.ts'

interface TranslationPanelProps {
  t: TextFn
  content: ChapterContent
  state: ReturnType<typeof useReaderTranslation>
}

export function translationBlocksOf(content: ChapterContent): TranslationBlockView[] {
  const blocks: TranslationBlockView[] = []
  content.blocks.forEach((block, index) => {
    if (block.type === 'image' || block.type === 'code') return
    const text = block.type === 'table' && block.rows?.length
      ? block.rows.map(row => row.join(' | ')).join('\n')
      : block.text
    if (typeof text === 'string' && text.trim()) blocks.push({ index, text })
  })
  return blocks
}

function translationOf(state: TranslationPanelProps['state'], index: number): BlockTranslation | undefined {
  return state.blocks[index]
}

export function TranslationPanel({ t, content, state }: TranslationPanelProps) {
  const blocks = React.useMemo(() => translationBlocksOf(content), [content])
  const [translatingAll, setTranslatingAll] = React.useState(false)
  const providers = state.providers.providers
  const runAll = async () => {
    if (translatingAll) return
    setTranslatingAll(true)
    try {
      await state.translateAll(blocks)
    } finally {
      setTranslatingAll(false)
    }
  }
  const blockRow = (block: TranslationBlockView) => {
    const translation = translationOf(state, block.index)
    const body = translation?.loading
      ? h('div', { className: 'dsh-readpilot-translation-loading' }, t('translating'))
      : translation?.error
        ? h('div', { className: 'dsh-readpilot-chat-error' }, translation.error)
        : translation?.text
          ? h('div', { className: 'dsh-readpilot-translation-text' }, translation.text)
          : h('button', {
            type: 'button',
            className: 'dsh-readpilot-note-jump dsh-readpilot-translation-block-action',
            onClick: () => void state.translateBlock(block),
          }, t('translateBlock'))
    return h('div', { key: block.index, className: 'dsh-readpilot-translation-block' },
      h('div', { className: 'dsh-readpilot-translation-original' }, block.text),
      body)
  }

  const settings = h('div', { className: 'dsh-readpilot-translation-settings' },
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
      h('option', { value: state.defaultProvider }, t('translationAuto')),
      providers.map(provider => h('option', { key: provider.id, value: provider.id },
        `${provider.name}${provider.paid ? ` · ${t('translationPaid')}` : ''}`)))),
    state.providersLoading
      ? h('div', { className: 'dsh-readpilot-long-hint' }, t('loading'))
      : state.providers.available
        ? null
        : h('div', { className: 'dsh-readpilot-long-hint' }, t('translationUnavailable')))

  const notice = state.noticeAcknowledged
    ? null
    : h('div', { className: 'dsh-readpilot-translation-notice' },
      h('span', null, t('translationNotice')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        onClick: state.acknowledgeNotice,
      }, t('translationNoticeOk')))

  const toolbar = h('div', { className: 'dsh-readpilot-translation-toolbar' },
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-chat-send',
      disabled: translatingAll || blocks.length === 0,
      onClick: () => void runAll(),
    }, translatingAll ? t('translating') : t('translateChapter')),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-note-jump',
      onClick: () => void state.clearCache(),
    }, t('translationClearCache')))

  return h('div', { className: 'dsh-readpilot-translation-panel' },
    settings,
    notice,
    toolbar,
    state.panelError ? h('div', { className: 'dsh-readpilot-chat-error' }, state.panelError) : null,
    blocks.length === 0
      ? h('div', { className: 'dsh-readpilot-chat-empty' }, t('translationEmpty'))
      : h('div', { className: 'dsh-readpilot-translation-list' }, blocks.map(blockRow)))
}
