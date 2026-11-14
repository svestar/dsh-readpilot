export interface PageReference {
  start: number
  end?: number
  text: string
  index: number
  length: number
}

const RANGE_RE = /(?:PDF\s*)?第?\s*(\d{1,5})\s*(?:[–—~～-]|至|到)\s*(\d{1,5})\s*页/g
const SINGLE_RE = /(?:PDF\s*)?第?\s*(\d{1,5})\s*页/g

function overlaps(left: PageReference, right: PageReference): boolean {
  return left.index < right.index + right.length && right.index < left.index + left.length
}

/** Find page references in rendered conversation text. Only pages, never chapter labels. */
export function findPageReferences(text: string): PageReference[] {
  const ranges: PageReference[] = []
  RANGE_RE.lastIndex = 0
  for (let match = RANGE_RE.exec(text); match; match = RANGE_RE.exec(text)) {
    const start = Number(match[1])
    const end = Number(match[2])
    if (!Number.isInteger(start) || start <= 0) continue
    ranges.push({
      start,
      ...(Number.isInteger(end) && end > 0 ? { end } : {}),
      text: match[0],
      index: match.index,
      length: match[0].length,
    })
  }

  const singles: PageReference[] = []
  SINGLE_RE.lastIndex = 0
  for (let match = SINGLE_RE.exec(text); match; match = SINGLE_RE.exec(text)) {
    const start = Number(match[1])
    if (!Number.isInteger(start) || start <= 0) continue
    const item = { start, text: match[0], index: match.index, length: match[0].length }
    if (!ranges.some(range => overlaps(range, item))) singles.push(item)
  }
  return [...ranges, ...singles].sort((left, right) => left.index - right.index)
}

const SKIP_SELECTOR = 'a,button,input,textarea,select,summary,code,pre,[contenteditable="true"],.dsh-readpilot-page-jump'

/** Wrap page references in buttons; safe to call repeatedly after chat mutations. */
export function linkifyPageReferences(root: Element, onJump: (page: number) => void): void {
  if (typeof document === 'undefined') return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue || !findPageReferences(node.nodeValue).length) continue
    const parent = node.parentElement
    if (parent?.closest(SKIP_SELECTOR)) continue
    nodes.push(node as Text)
  }
  for (const node of nodes) {
    const text = node.nodeValue ?? ''
    const refs = findPageReferences(text)
    if (refs.length === 0) continue
    const fragment = document.createDocumentFragment()
    let cursor = 0
    for (const ref of refs) {
      if (ref.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, ref.index)))
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'dsh-readpilot-page-jump'
      button.textContent = ref.text
      button.title = `跳转到第 ${ref.start} 页`
      button.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        onJump(ref.start)
      })
      fragment.appendChild(button)
      cursor = ref.index + ref.length
    }
    if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)))
    node.parentNode?.replaceChild(fragment, node)
  }
}
