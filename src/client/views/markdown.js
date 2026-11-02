import { h } from '../runtime.js'
import { parseMarkdownBlocks } from '../helpers.js'

export function inline(text, prefix) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
  const nodes = []
  let last = 0
  let index = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${prefix}-${index}`
    index += 1
    if (token.startsWith('**')) {
      nodes.push(h('strong', { key }, token.slice(2, -2)))
    } else if (token.startsWith('`')) {
      nodes.push(h('code', { key }, token.slice(1, -1)))
    } else if (token.startsWith('*')) {
      nodes.push(h('em', { key }, token.slice(1, -1)))
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link && /^(https?:|mailto:|#)/i.test(link[2])) {
        nodes.push(h('a', { key, href: link[2], target: '_blank', rel: 'noreferrer' }, link[1]))
      } else {
        nodes.push(link ? link[1] : token)
      }
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function selectionAnchor(range, container) {
  const startNode = range.startContainer
  const element = startNode.nodeType === 1 ? startNode : startNode.parentElement
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

export function renderBlocks(blocks, prefix) {
  return blocks.map((block, index) => {
    const key = `${prefix}-${index}`
    if (block.type === 'h') {
      const level = Math.min(6, Math.max(3, block.level ?? 3))
      return h(`h${level}`, { key, 'data-block-index': index }, inline(block.text, key))
    }
    if (block.type === 'code') {
      return h('pre', { key, 'data-block-index': index }, h('code', null, block.text))
    }
    if (block.type === 'quote') {
      return h('blockquote', { key, 'data-block-index': index }, inline(block.text, key))
    }
    if (block.type === 'hr') {
      return h('hr', { key, 'data-block-index': index, className: 'dsh-reader-md-hr' })
    }
    if (block.type === 'li') {
      return h('div', { key, 'data-block-index': index, className: 'dsh-reader-li' },
        h('span', { className: 'dsh-reader-li-marker' }, block.ordered ? `${block.index}.` : '•'),
        h('span', null, inline(block.text, key)))
    }
    return h('p', { key, 'data-block-index': index }, inline(block.text, key))
  })
}

export function MarkdownMessage({ text, prefix }) {
  return h('div', { className: 'dsh-reader-md' }, renderBlocks(parseMarkdownBlocks(text), prefix))
}
