import { h } from '../runtime.ts'
import type { Screen, TextFn } from '../types.ts'

interface HeaderProps {
  t: TextFn
  screen: Screen
  title: string
  subtitle: string
  onBack: () => void
  searchOpen: boolean
  settingsOpen: boolean
  onToggleSettings: () => void
  openingWorkspace: boolean
  onOpenWorkspace: () => void
  onToggleSearch: () => void
  onToggleChat: () => void
  onToggleToc: () => void
  onBookmark: () => void
}

export function Header({
  t,
  screen,
  title,
  subtitle,
  onBack,
  searchOpen,
  settingsOpen,
  onToggleSettings,
  openingWorkspace,
  onOpenWorkspace,
  onToggleSearch,
  onToggleChat,
  onToggleToc,
  onBookmark,
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
    screen.kind === 'book'
      ? h('div', { className: 'dsh-readpilot-header-workspace' },
        h('button', {
          type: 'button',
          className: 'dsh-readpilot-secondary dsh-readpilot-workspace-btn',
          disabled: openingWorkspace,
          title: openingWorkspace ? t('openingWorkspace') : t('openWorkspace'),
          onClick: onOpenWorkspace,
        }, openingWorkspace ? '…' : t('openWorkspace')))
      : null,
    h('div', { className: 'dsh-readpilot-header-actions' },
      screen.kind === 'book'
        ? h('button', {
          type: 'button',
          className: 'dsh-readpilot-icon-btn dsh-readpilot-settings-btn',
          'data-active': settingsOpen ? 'true' : 'false',
          title: t('readerSettings'),
          'aria-expanded': settingsOpen ? 'true' : 'false',
          onClick: onToggleSettings,
        }, 'Aa')
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
        : null))
}
