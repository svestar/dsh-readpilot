import { MarkdownText, React, h } from '../common/runtime.ts'
import type { TextFn } from '../common/types.ts'
import { MarkdownMessage } from './render.ts'

interface DshMarkdownProps {
  t: TextFn
  text: string
  prefix: string
  streaming?: boolean
}

/** Use the host Markdown renderer for non-reading previews, with a local fallback. */
export function DshMarkdown({ t, text, prefix, streaming = false }: DshMarkdownProps) {
  const labels = React.useMemo(() => ({
    code: {
      copyLabel: t('mdCopy'),
      copiedLabel: t('mdCopied'),
      toolbarLabels: {
        codeLabel: t('mdCode'),
        wrapLabel: t('mdWrap'),
        unwrapLabel: t('mdUnwrap'),
      },
    },
    footnotes: t('mdFootnotes'),
  }), [t])
  if (typeof MarkdownText !== 'function') {
    return h(MarkdownMessage, { text, prefix })
  }
  return h('div', { className: 'dsh-readpilot-dsh-markdown', 'data-prefix': prefix },
    h(MarkdownText, { text, streaming, labels }))
}
