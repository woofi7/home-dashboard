export type Segment = { text: string; highlight: boolean }

export function fuzzyMatch(str: string, query: string): { score: number; segments: Segment[] } | null {
  const s = str.toLowerCase()
  const q = query.toLowerCase()

  if (s.includes(q)) {
    const idx = s.indexOf(q)
    const score = s === q ? 1000 : s.startsWith(q) ? 500 : 200
    return {
      score,
      segments: [
        ...(idx > 0 ? [{ text: str.slice(0, idx), highlight: false }] : []),
        { text: str.slice(idx, idx + q.length), highlight: true },
        ...(idx + q.length < str.length ? [{ text: str.slice(idx + q.length), highlight: false }] : []),
      ],
    }
  }

  const matchedIndices: number[] = []
  let si = 0
  let score = 0
  let consecutive = 0
  for (let qi = 0; qi < q.length; qi++) {
    let matched = false
    while (si < s.length) {
      if (s[si] === q[qi]) {
        score += 1 + consecutive * 2
        consecutive++
        matchedIndices.push(si)
        si++
        matched = true
        break
      }
      consecutive = 0
      si++
    }
    if (!matched)
      return null
  }

  const segments: Segment[] = []
  let prev = 0
  for (const idx of matchedIndices) {
    if (idx > prev)
      segments.push({ text: str.slice(prev, idx), highlight: false })
    segments.push({ text: str[idx], highlight: true })
    prev = idx + 1
  }
  if (prev < str.length)
    segments.push({ text: str.slice(prev), highlight: false })

  return { score, segments }
}
