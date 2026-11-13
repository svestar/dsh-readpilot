import { React, h } from './runtime.ts'
import type { BookFormat } from '../books/formats.ts'
import { MAX_FONT_SIZE, MIN_FONT_SIZE, READER_PALETTE_IDS } from './helpers.ts'
import type { PageLayout, ReaderCapabilities, ReaderMode } from './paging.ts'
import type { TextFn } from './types.ts'

export type { ReaderCapabilities } from './paging.ts'

export interface ReaderSettingsProps {
  t: TextFn
  format: BookFormat
  source: boolean
  flow: ReaderMode
  spread: PageLayout
  fontSize: number
  paletteId: string
  glassBlur: number
  capabilities: ReaderCapabilities
  onSource: (reflow: boolean) => void
  onFlow: (flow: ReaderMode) => void
  onSpread: (layout: PageLayout) => void
  onFontSize: (size: number) => void
  onPalette: (id: string) => void
  onGlassBlur: (value: number) => void
  onClose: () => void
}

function segment(label: string, active: boolean, onClick: () => void, disabled = false, title = '') {
  return h('button', {
    type: 'button',
    className: 'dsh-readpilot-segment',
    'data-active': active ? 'true' : 'false',
    disabled,
    title: title || label,
    onClick,
  }, label)
}

export function ReaderSettings({
  t,
  format,
  source,
  flow,
  spread,
  fontSize,
  paletteId,
  glassBlur,
  capabilities,
  onSource,
  onFlow,
  onSpread,
  onFontSize,
  onPalette,
  onGlassBlur,
  onClose,
}: ReaderSettingsProps) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sourceSection = capabilities.source
    ? h('section', { className: 'dsh-readpilot-settings-section' },
      h('div', { className: 'dsh-readpilot-settings-label' }, t('sourceMode')),
      h('div', { className: 'dsh-readpilot-segmented' },
        segment(t('sourceOriginal'), !source, () => onSource(false)),
        segment(t('sourceReflow'), source, () => onSource(true))),
      h('p', { className: 'dsh-readpilot-settings-hint' }, t('sourceHint')))
    : null

  const flowSection = capabilities.flows.length > 1
    ? h('section', { className: 'dsh-readpilot-settings-section' },
      h('div', { className: 'dsh-readpilot-settings-label' }, t('readingFlow')),
      h('div', { className: 'dsh-readpilot-segmented' },
        capabilities.flows.map(mode => segment(
          t(mode === 'paged' ? 'pagedMode' : 'scrollMode'),
          flow === mode,
          () => onFlow(mode),
        ))))
    : null

  const spreadDisabled = !capabilities.spread
  const spreadSection = flow === 'paged' && (capabilities.spread || (format === 'pdf' && source))
    ? h('section', { className: 'dsh-readpilot-settings-section' },
      h('div', { className: 'dsh-readpilot-settings-label' }, t('pageLayout')),
      h('div', { className: 'dsh-readpilot-segmented' },
        segment(t('singlePage'), spread === 'single', () => onSpread('single'), spreadDisabled),
        segment(t('doublePage'), spread === 'double', () => onSpread('double'), spreadDisabled)),
      spreadDisabled ? h('p', { className: 'dsh-readpilot-settings-hint' }, t('pdfReflowSingleHint')) : null)
    : null

  const fontSection = capabilities.fontSize
    ? h('section', { className: 'dsh-readpilot-settings-section' },
      h('div', { className: 'dsh-readpilot-settings-label' }, t('fontSize')),
      h('div', { className: 'dsh-readpilot-settings-font' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary',
          disabled: fontSize <= MIN_FONT_SIZE,
          onClick: () => onFontSize(fontSize - 1),
        }, 'A−'),
        h('span', { className: 'dsh-readpilot-settings-value' }, `${fontSize}px`),
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary',
          disabled: fontSize >= MAX_FONT_SIZE,
          onClick: () => onFontSize(fontSize + 1),
        }, 'A+')))
    : null

  const appearance = h('section', { className: 'dsh-readpilot-settings-section' },
    h('div', { className: 'dsh-readpilot-settings-label' }, t('theme')),
    h('select', {
      className: 'dsh-readpilot-palette-select',
      value: paletteId,
      title: t('palette'),
      'aria-label': t('palette'),
      onChange: (event: any) => onPalette(event.target.value),
    }, READER_PALETTE_IDS.map(id => h('option', { key: id, value: id },
      t(`palette${id[0].toUpperCase()}${id.slice(1)}`)))),
    paletteId === 'glass'
      ? h('label', { className: 'dsh-readpilot-settings-blur' },
        h('span', null, t('blur')),
        h('input', {
          type: 'range',
          min: 0,
          max: 80,
          step: 1,
          value: glassBlur,
          'aria-label': t('blur'),
          onChange: (event: any) => onGlassBlur(Number(event.target.value)),
        }),
        h('span', { className: 'dsh-readpilot-settings-value' }, `${glassBlur}px`))
      : null)

  return h('div', {
    className: 'dsh-readpilot-settings-backdrop',
    onMouseDown: (event: any) => {
      if (event.target === event.currentTarget) onClose()
    },
  },
  h('div', {
    className: 'dsh-readpilot-settings',
    role: 'dialog',
    'aria-label': t('readerSettings'),
    onMouseDown: (event: any) => event.stopPropagation(),
  },
  h('header', { className: 'dsh-readpilot-settings-head' },
    h('h3', null, t('readerSettings')),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-icon-btn',
      title: t('close'),
      'aria-label': t('close'),
      onClick: onClose,
    }, '×')),
  sourceSection,
  flowSection,
  spreadSection,
  fontSection,
  appearance))
}
