import { h } from '../../runtime.ts'
import { parseMarkdownBlocks } from '../../lib/helpers.ts'
import type { MarkdownBlock } from '../../lib/helpers.ts'

function safeHref(value: string): string | null {
  if (!/^(https?:|mailto:|#)/i.test(value)) return null
  return value
}

function safeImageSrc(value: string): string | null {
  if (!value || /^(?:javascript|vbscript):/i.test(value)) return null
  if (/^(?:https?:|data:image\/|\/|\.{1,2}\/)/i.test(value)) return value
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return null
}

export function inline(text: string, prefix: string): any[] {
  const pattern = /(!\[[^\]]*\]\([^)\s]+\)|`[^`\n]+`|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|\[\^[^\]]+\]|\[[^\]]+\]\([^)\s]+\)|<(?:https?|mailto):[^>\s]+>|https?:\/\/[^\s<)]+)/g
  const nodes: any[] = []
  let last = 0
  let index = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${prefix}-${index}`
    index += 1
    const footnote = /^\[\^([^\]]+)\]$/.exec(token)
    if (footnote) {
      const id = footnote[1].replace(/[^A-Za-z0-9_-]/g, '-')
      nodes.push(h('sup', { key, className: 'dsh-readpilot-footnote-ref' },
        h('a', { href: `#dsh-readpilot-fn-${id}`, id: `dsh-readpilot-fnref-${id}` }, id)))
    } else {
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(token)
    if (image) {
      const src = safeImageSrc(image[2])
      if (src) nodes.push(h('img', { key, src, alt: image[1], loading: 'lazy', className: 'dsh-readpilot-inline-image' }))
      else nodes.push(image[1] || token)
    } else if (token.startsWith('**')) {
      nodes.push(h('strong', { key }, token.slice(2, -2)))
    } else if (token.startsWith('~~')) {
      nodes.push(h('s', { key }, token.slice(2, -2)))
    } else if (token.startsWith('`')) {
      nodes.push(h('code', { key }, token.slice(1, -1)))
    } else if (token.startsWith('*')) {
      nodes.push(h('em', { key }, token.slice(1, -1)))
    } else if (token.startsWith('<')) {
      const href = safeHref(token.slice(1, -1))
      if (href) nodes.push(h('a', { key, href, target: '_blank', rel: 'noreferrer' }, token.slice(1, -1)))
      else nodes.push(token)
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      const href = link ? safeHref(link[2]) : null
      if (link && href) {
        nodes.push(h('a', { key, href, target: '_blank', rel: 'noreferrer' }, link[1]))
      } else if (link) {
        nodes.push(link[1])
      } else if (/^https?:\/\//i.test(token)) {
        nodes.push(h('a', { key, href: token, target: '_blank', rel: 'noreferrer' }, token))
      } else {
        nodes.push(token)
      }
    }
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function selectionAnchor(range: Range, container: Element): { blockIndex: number; offset: number } | null {
  const startNode = range.startContainer
  const element = startNode.nodeType === 1 ? startNode as Element : startNode.parentElement
  const block = element && typeof element.closest === 'function'
    ? element.closest('[data-block-index]')
    : null
  if (!block || !container.contains(block)) return null
  const blockIndex = Number(block.getAttribute('data-block-index'))
  if (!Number.isInteger(blockIndex) || blockIndex < 0) return null
  const before = range.cloneRange()
  before.selectNodeContents(block)
  before.setEnd(range.startContainer, range.startOffset)
  return { blockIndex, offset: before.toString().length }
}

function taskItem(block: MarkdownBlock, key: string, index: number): any {
  const checked = block.checked === true
  return h('div', {
    key,
    'data-block-index': index,
    className: 'dsh-readpilot-li dsh-readpilot-task',
    style: { paddingLeft: `${(block.indent ?? 0) * 16}px` },
  },
  h('input', { type: 'checkbox', checked, disabled: true, 'aria-label': checked ? 'checked' : 'unchecked' }),
  h('span', null, inline(block.text ?? '', key)))
}

export function renderBlocks(blocks: readonly MarkdownBlock[], prefix: string): any[] {
  return blocks.map((block, index) => {
    const key = `${prefix}-${index}`
    if (block.type === 'footnote' && block.footnoteId) {
      const id = block.footnoteId.replace(/[^A-Za-z0-9_-]/g, '-')
      return h('div', {
        key,
        id: `dsh-readpilot-fn-${id}`,
        'data-block-index': index,
        className: 'dsh-readpilot-footnote',
      },
      h('span', { className: 'dsh-readpilot-footnote-id' }, `[${id}]`),
      h('span', null, inline(block.text ?? '', key)))
    }
    if (block.type === 'h') {
      const level = Math.min(6, Math.max(1, block.level ?? 3))
      return h(`h${level}`, { key, 'data-block-index': index }, inline(block.text ?? '', key))
    }
    if (block.type === 'code') {
      const language = block.lang && /^[A-Za-z0-9_+-]+$/.test(block.lang) ? block.lang : undefined
      return h('pre', { key, 'data-block-index': index },
        h('code', { className: language ? `language-${language}` : undefined }, block.text))
    }
    if (block.type === 'quote') {
      return h('blockquote', { key, 'data-block-index': index }, inline(block.text ?? '', key))
    }
    if (block.type === 'hr') {
      return h('hr', { key, 'data-block-index': index, className: 'dsh-readpilot-md-hr' })
    }
    if (block.type === 'image' && block.src) {
      const src = safeImageSrc(block.src)
      const alt = block.alt ?? block.text ?? ''
      return h('figure', { key, 'data-block-index': index, className: 'dsh-readpilot-figure' },
        src ? h('img', { src, alt, loading: 'lazy' }) : null,
        alt ? h('figcaption', null, alt) : null)
    }
    if (block.type === 'table' && block.rows?.length) {
      const [header, ...body] = block.rows
      return h('table', { key, 'data-block-index': index, className: 'dsh-readpilot-table' },
        h('thead', null,
          h('tr', null, header.map((cell, cellIndex) =>
            h('th', { key: `${key}-h-${cellIndex}` }, inline(cell, `${key}-h-${cellIndex}`))))),
        body.length
          ? h('tbody', null, body.map((row, rowIndex) =>
            h('tr', { key: `${key}-${rowIndex}` }, row.map((cell, cellIndex) =>
              h('td', { key: `${key}-${rowIndex}-${cellIndex}` }, inline(cell, `${key}-${rowIndex}-${cellIndex}`))))))
          : null)
    }
    if (block.type === 'li' && (block.checked === true || block.checked === false)) {
      return taskItem(block, key, index)
    }
    if (block.type === 'li') {
      return h('div', {
        key,
        'data-block-index': index,
        className: 'dsh-readpilot-li',
        style: { paddingLeft: `${(block.indent ?? 0) * 16}px` },
      },
      h('span', { className: 'dsh-readpilot-li-marker' }, block.ordered ? `${block.index}.` : '•'),
      h('span', null, inline(block.text ?? '', key)))
    }
    return h('p', { key, 'data-block-index': index }, inline(block.text ?? '', key))
  })
}

export function MarkdownMessage({ text, prefix }: { text: string; prefix: string }) {
  return h('div', { className: 'dsh-readpilot-md' }, renderBlocks(parseMarkdownBlocks(text), prefix))
}
