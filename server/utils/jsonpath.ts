/**
 * JSONPath resolver supporting:
 *   $.a.b.c          — property traversal
 *   $.a[0].b         — array index
 *   $.a.length       — array length
 *   $.a[field=value] — filter array by field equality, returns matching items
 *   $.a[field=value].length  — count matching items
 *   $.a[field=value].b       — pluck field from each matching item (returns array)
 *   sum:$.a[...].b   — sum numeric values of a plucked field
 */
export function resolveJsonPath(obj: unknown, path: string): unknown {
  // sum: prefix — sum the result of the inner path
  if (path.startsWith('sum:')) {
    const inner = resolveJsonPath(obj, path.slice(4))
    if (Array.isArray(inner)) {
      return inner.reduce((acc: number, v) => acc + (Number(v) || 0), 0)
    }
    return Number(inner) || 0
  }

  if (!path.startsWith('$.')) return path
  const raw = path.slice(2)

  // Split into segments, keeping filter brackets intact
  const segments: string[] = []
  let buf = ''
  let depth = 0
  for (const ch of raw) {
    if (ch === '[') { depth++; buf += ch }
    else if (ch === ']') { depth--; buf += ch }
    else if (ch === '.' && depth === 0) { if (buf) segments.push(buf); buf = '' }
    else buf += ch
  }
  if (buf) segments.push(buf)

  let current: unknown = obj
  for (const seg of segments) {
    if (current == null) return null

    // Array index: [0]
    const idxMatch = seg.match(/^\[(\d+)\]$/)
    if (idxMatch) {
      if (!Array.isArray(current)) return null
      current = (current as unknown[])[Number(idxMatch[1])]
      continue
    }

    // Property + array index: prop[0]
    const propIdxMatch = seg.match(/^(\w+)\[(\d+)\]$/)
    if (propIdxMatch) {
      const arr = (current as Record<string, unknown>)[propIdxMatch[1]]
      if (!Array.isArray(arr)) return null
      current = (arr as unknown[])[Number(propIdxMatch[2])]
      continue
    }

    // Filter: field[key=value]  or  [key=value]
    const filterMatch = seg.match(/^(\w+)?\[(\w+)=([^\]]+)\]$/)
    if (filterMatch) {
      const [, prop, key, val] = filterMatch
      let arr: unknown = prop ? (current as Record<string, unknown>)[prop] : current
      if (!Array.isArray(arr)) return null
      arr = (arr as Record<string, unknown>[]).filter((item) => String(item[key]) === val)
      current = arr
      continue
    }

    // length on array
    if (seg === 'length' && Array.isArray(current)) {
      current = (current as unknown[]).length
      continue
    }

    // Pluck field from array of objects (null-safe)
    if (Array.isArray(current)) {
      current = (current as Record<string, unknown>[]).map((item) => item?.[seg] ?? null)
      continue
    }

    if (typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[seg]
  }

  return current ?? null
}
