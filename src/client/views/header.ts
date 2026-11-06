import { h } from '../runtime.ts'
import { READER_PALETTE_IDS } from '../helpers.ts'
import type { Screen, TextFn } from '../types.ts'

interface HeaderProps {
  t: TextFn
  screen: Screen
  title: string
  subtitle: string
  onBack: () => void
  paletteId: string
  onChangePalette: (id: string) => void
  glassBlur: number
  onChangeGlassBlur: (value: number) => void
  searchOpen: boolean
  onToggleSearch: () => void
  onToggleChat: () => void
  onToggleToc: () => void
  onBookmark: () => void
  onFontDecrease: () => void
  onFontIncrease: () => void
  reflowSupported: boolean
  reflow: boolean
  onToggleReflow: () => void
}

export function Header({
  t,
  screen,
  title,
  subtitle,
  onBack,
  paletteId,
  onChangePalette,
  glassBlur,
  onChangeGlassBlur,
  searchOpen,
  onToggleSearch,
  onToggleChat,
  onToggleToc,
  onBookmark,
  onFontDecrease,
  onFontIncrease,
  reflowSupported,
  reflow,
  onToggleReflow,
}: HeaderProps) {
  return h('div', { className: 'dsh-readpilot-header' },
    h('div', { className: 'dsh-readpilot-header-main' },
      screen.kind !== 'library'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('back'),
          onClick: onBack,
        }, '←')
        : null,
      h('div', { style: { minWidth: 0 } },
        h('div', { className: 'dsh-readpilot-title' }, title),
        subtitle ? h('div', { className: 'dsh-readpilot-subtitle' }, subtitle) : null)),
    h('div', { className: 'dsh-readpilot-header-actions' },
      screen.kind === 'book' && paletteId === 'glass'
        ? h('label', { className: 'dsh-readpilot-blur-control', title: t('blur') },
          h('span', null, t('blur')),
          h('input', {
            type: 'range',
            min: 0,
            max: 80,
            step: 1,
            value: glassBlur,
            'aria-label': t('blur'),
            onChange: (event: any) => onChangeGlassBlur(Number(event.target.value)),
          }),
          h('span', { className: 'dsh-readpilot-blur-value' }, `${glassBlur}px`))
        : null,
      screen.kind === 'book'
        ? h('select', {
          className: 'dsh-readpilot-palette-select',
          value: paletteId,
          title: t('palette'),
          'aria-label': t('palette'),
          onChange: (event: any) => onChangePalette(event.target.value),
        }, READER_PALETTE_IDS.map(id => h('option', { key: id, value: id },
          t(`palette${id[0].toUpperCase()}${id.slice(1)}`))))
        : null,
      screen.kind === 'book' && reflowSupported
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          'data-active': reflow ? 'true' : 'false',
          title: reflow ? t('reflowOriginal') : t('reflowMode'),
          onClick: onToggleReflow,
        }, reflow ? t('reflowOriginal') : t('reflowMode'))
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('search'),
          'aria-expanded': searchOpen ? 'true' : 'false',
          onClick: onToggleSearch,
        }, t('search'))
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('companion'),
          onClick: onToggleChat,
        }, t('companion'))
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('bookmark'),
          onClick: onBookmark,
        }, '🔖')
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('toc'),
          onClick: onToggleToc,
        }, '☰')
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('fontSize'),
          onClick: onFontDecrease,
        }, 'A-')
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn',
          title: t('fontSize'),
          onClick: onFontIncrease,
        }, 'A+')
        : null))
}
