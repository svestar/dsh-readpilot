import { React, h } from '../runtime.ts'
import type { TextFn } from '../types.ts'

export function PanelIcon({ size = 20, active }: { size?: number; active?: boolean }) {
  return h('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    style: { display: 'block' },
  },
  h('path', {
    d: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H11v15H6.5A2.5 2.5 0 0 0 4 21.5z',
    fill: active ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
    opacity: active ? 0.9 : 1,
  }),
  h('path', {
    d: 'M20 6.5A2.5 2.5 0 0 0 17.5 4H13v15h4.5A2.5 2.5 0 0 1 20 21.5z',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinejoin: 'round',
  }),
  h('path', { d: 'M12 4v15.5', stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.55 }))
}

interface SetupProps {
  t: TextFn
  initialPath?: string
  busy: boolean
  onConfigure: (path: string) => void | Promise<void>
  onPick: (setPath: (value: string) => void) => void
  onCancel?: (() => void) | null
}

export function Setup({ t, initialPath, busy, onConfigure, onPick, onCancel }: SetupProps) {
  const [path, setPath] = React.useState(initialPath ?? '')
  const row = h('div', { className: 'dsh-readpilot-path-row' },
    h('input', {
      value: path,
      placeholder: t('pathPlaceholder'),
      spellCheck: false,
      onChange: (event: any) => setPath(event.target.value),
    }),
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-secondary',
      onClick: () => onPick(setPath),
    }, t('chooseDir')))
  const actions = h('div', { className: 'dsh-readpilot-setup-actions' },
    h('button', {
      type: 'button',
      className: 'dsh-readpilot-primary',
      disabled: busy || !path.trim(),
      onClick: () => onConfigure(path.trim()),
    }, busy ? t('loading') : t('create')),
    onCancel
      ? h('button', {
        type: 'button',
        className: 'dsh-readpilot-secondary',
        onClick: onCancel,
      }, t('cancel'))
      : null)
  return h('div', { className: 'dsh-readpilot-setup' },
    h('div', { className: 'dsh-readpilot-setup-card' },
      h('h2', null, t('setupTitle')),
      h('p', null, t('setupHint')),
      row,
      actions))
}
