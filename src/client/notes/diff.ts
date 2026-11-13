export interface DiffLine {
  type: 'same' | 'add' | 'del'
  text: string
}

export function diffLines(base: string, next: string): DiffLine[] {
  const before = String(base ?? '').replace(/\r\n?/g, '\n').split('\n')
  const after = String(next ?? '').replace(/\r\n?/g, '\n').split('\n')
  let prefix = 0
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < before.length - prefix
    && suffix < after.length - prefix
    && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) suffix += 1
  const lines: DiffLine[] = []
  for (let index = 0; index < prefix; index += 1) lines.push({ type: 'same', text: before[index] })
  for (let index = prefix; index < before.length - suffix; index += 1) lines.push({ type: 'del', text: before[index] })
  for (let index = prefix; index < after.length - suffix; index += 1) lines.push({ type: 'add', text: after[index] })
  for (let index = before.length - suffix; index < before.length; index += 1) lines.push({ type: 'same', text: before[index] })
  return lines
}
