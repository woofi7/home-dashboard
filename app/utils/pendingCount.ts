/**
 * Counts differences between two lists by index.
 * Used for pending-change counting so a rename is 1 change, not 2.
 */
export function countListChanges(snapItems: unknown[], curItems: unknown[]): number {
  const len = Math.max(snapItems.length, curItems.length)
  let n = 0
  for (let i = 0; i < len; i++) {
    if (!snapItems[i] || !curItems[i] || JSON.stringify(snapItems[i]) !== JSON.stringify(curItems[i])) n++
  }
  return n
}
