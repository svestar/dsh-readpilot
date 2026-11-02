export function blocksText(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map(block => block?.text ?? '').join('\n\n')
}

export function offsetInChapter(blocks, blockIndex, offset) {
  let start = 0
  for (let index = 0; index < blockIndex; index += 1) {
    start += (blocks[index]?.text ?? '').length + 2
  }
  return start + Math.max(0, Number.isInteger(offset) ? offset : 0)
}

export function contextAround(text, start, end, size = 32) {
  const value = typeof text === 'string' ? text : ''
  const from = Math.max(0, Math.min(value.length, start))
  const to = Math.max(from, Math.min(value.length, end))
  return {
    prefix: value.slice(Math.max(0, from - size), from),
    suffix: value.slice(to, Math.min(value.length, to + size)),
  }
}

export function hashText(text) {
  let hash = 0x811c9dc5
  for (const character of String(text ?? '')) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
