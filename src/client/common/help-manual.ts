import { Modal, React, h } from './runtime.ts'
import type { TextFn } from './types.ts'
import { HELP_TOPICS } from './help-content.ts'

interface HelpManualProps {
  t: TextFn
  onClose: () => void
}

export function HelpManual({ t, onClose }: HelpManualProps) {
  const [active, setActive] = React.useState(HELP_TOPICS[0].id)
  const topic = HELP_TOPICS.find(item => item.id === active) ?? HELP_TOPICS[0]
  return h(Modal, {
    open: true,
    onClose,
    closeLabel: t('close'),
    title: t('helpTitle'),
    headless: true,
    className: 'dsh-readpilot-help',
  },
  h('header', { className: 'dsh-readpilot-help-head' },
    h('div', null,
      h('h3', null, t('helpTitle')),
      h('p', null, t('helpIntro'))),
    h('button', { type: 'button', className: 'dsh-readpilot-icon-btn', 'aria-label': t('close'), onClick: onClose }, '×')),
  h('div', { className: 'dsh-readpilot-help-layout' },
    h('nav', { className: 'dsh-readpilot-help-nav' },
      HELP_TOPICS.map(item => h('button', {
        key: item.id,
        type: 'button',
        className: 'dsh-readpilot-help-topic',
        'data-active': item.id === topic.id ? 'true' : 'false',
        onClick: () => setActive(item.id),
      }, t(item.titleKey)))),
    h('article', { className: 'dsh-readpilot-help-body' },
      h('h4', null, t(topic.titleKey)),
      h('p', null, t(topic.bodyKey)))),
  h('footer', { className: 'dsh-readpilot-help-footer' },
    h('a', {
      href: 'https://github.com/svestar/dsh-readpilot/blob/main/USAGE.md',
      target: '_blank',
      rel: 'noreferrer',
    }, t('helpDocs')),
    h('a', {
      href: 'https://github.com/svestar/dsh-readpilot',
      target: '_blank',
      rel: 'noreferrer',
    }, t('helpGithub')),
    h('button', { type: 'button', className: 'dsh-readpilot-secondary', onClick: onClose }, t('close'))))
}
