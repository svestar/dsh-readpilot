/**
 * Normalize a tool result to lossless JSON. DSH rejects a tool call whose value
 * does not survive a JSON round trip: `undefined` fields, non-finite numbers and
 * non-plain objects all fail. Dropping `undefined` matches what the model already
 * sees, because the rendered text is `JSON.stringify(value)`.
 */
export function losslessJson(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return Object.is(value, -0) ? 0 : value
  }
  if (Array.isArray(value)) return value.map(losslessJson)
  if (typeof value === 'object') {
    const plain: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === undefined) continue
      plain[key] = losslessJson(child)
    }
    return plain
  }
  return null
}
