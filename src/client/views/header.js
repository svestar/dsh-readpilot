import { h } from '../runtime.js'
import { READER_PALETTE_IDS } from '../helpers.js'

export function Header({
  t,
  screen,
  title,
  subtitle,
  onBack,
  paletteId,
  onChangePalette,
  searchOpen,
  onToggleSearch,
  onToggleChat,
  onToggleToc,
  onFontDecrease,
  onFontIncrease,
}) {
  return h('div', { className: 'dsh-reader-header' },
    h('div', { className: 'dsh-reader-header-main' },
      screen.kind !== 'library'
        ? h('button', {
          type: 'button',
          className: 'dsh-reader-icon-btn',
          title: t('back'),
          onClick: onBack,
        }, '←')
        : null,
      h('div', { style: { minWidth: 0 } },
        h('div', { className: 'dsh-reader-title' }, title),
        subtitle ? h('div', { className: 'dsh-reader-subtitle' }, subtitle) : null)),
    h('div', { className: 'dsh-reader-header-actions' },
      screen.kind === 'book'
        ? h('select', {
          className: 'dsh-reader-palette-select',
          value: paletteId,
          title: t('palette'),
          'aria-label': t('palette'),
          onChange: event => onChangePalette(event.target.value),
        }, READER_PALETTE_IDS.map(id => h('option', { key: id, value: id },
          t(`palette${id[0].toUpperCase()}${id.slice(1)}`))))
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-reader-icon-btn',
          title: t('search'),
          'aria-expanded': searchOpen ? 'true' : 'false',
          onClick: onToggleSearch,
        }, t('search'))
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-reader-icon-btn',
          title: t('companion'),
          onClick: onToggleChat,
        }, t('companion'))
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-reader-icon-btn',
          title: t('toc'),
          onClick: onToggleToc,
        }, '☰')
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-reader-icon-btn',
          title: t('fontSize'),
          onClick: onFontDecrease,
        }, 'A-')
        : null,
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-reader-icon-btn',
          title: t('fontSize'),
          onClick: onFontIncrease,
        }, 'A+')
        : null))
}
