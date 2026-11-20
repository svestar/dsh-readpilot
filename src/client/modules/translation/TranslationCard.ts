import { React, createPortal, h } from '../../runtime.ts'
import type { TextFn } from '../../lib/types.ts'
import type { SelectionTranslation } from './use-reader-translation.ts'

const EDGE = 10
const WIDTH = 320

interface TranslationCardProps {
  t: TextFn
  result: SelectionTranslation | null
  onClose: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** One-shot translation of the current selection; rendered outside the reader. */
export function TranslationCard({ t, result, onClose }: TranslationCardProps) {
  const [copied, setCopied] = React.useState(false)
  if (!result || !document.body) return null
  const maxLeft = Math.max(EDGE, (typeof window !== 'undefined' ? window.innerWidth : 1200) - WIDTH - EDGE)
  const left = clamp(result.x - WIDTH / 2, EDGE, maxLeft)
  const top = clamp(result.y + 18, EDGE, Math.max(EDGE, (typeof window !== 'undefined' ? window.innerHeight : 800) - 180))
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access is best effort.
    }
  }
  return createPortal(h('div', {
    className: 'dsh-readpilot-translation-card',
    style: { left, top, width: WIDTH },
    role: 'dialog',
    'aria-label': t('translation'),
  },
  h('div', { className: 'dsh-readpilot-translation-card-head' },
    h('span', null, t('translation')),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-icon-btn',
      'aria-label': t('close'),
      onClick: onClose,
    }, '×')),
  h('div', { className: 'dsh-readpilot-translation-source' }, result.source.slice(0, 240)),
  result.loading
    ? h('div', { className: 'dsh-readpilot-translation-loading' }, t('translating'))
    : result.error
      ? h('div', { className: 'dsh-readpilot-chat-error' }, result.error)
      : h('div', { className: 'dsh-readpilot-translation-text' }, result.text),
  !result.loading && !result.error
    ? h('div', { className: 'dsh-readpilot-translation-foot' },
      h('span', null, result.provider + (result.cached ? ` · ${t('translationCached')}` : '')),
      h('button', {
        type: 'button',
        className: 'dsh-readpilot-note-jump',
        onClick: () => void copy(),
      }, copied ? t('mdCopied') : t('mdCopy')))
    : null)
  , document.body)
}
