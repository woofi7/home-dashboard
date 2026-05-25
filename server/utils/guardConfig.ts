/**
 * For reorderGroups operations: ensure no items are silently dropped due to
 * frontend bugs (e.g. drag-and-drop state desync).
 *
 * Only checks groups that are PRESENT in the incoming payload — a group absent
 * from incoming was intentionally deleted and its items must not be recovered.
 * Within surviving groups, any item present in the raw YAML but absent from
 * the entire incoming payload is treated as accidentally lost and recovered
 * back into its original group.
 */
export function recoverOrphanedItems<T extends { name: string }>(
  rawGroups: Array<{ name: string; [key: string]: unknown }>,
  incoming: Array<{ name: string; [key: string]: unknown }>,
  itemsKey: string,
): Array<{ name: string; [key: string]: unknown }> {
  const incomingGroupNames = new Set(incoming.map(g => g.name))
  const incomingItemNames = new Set(
    incoming.flatMap(g => ((g[itemsKey] as T[]) ?? []).map((i: T) => i.name)),
  )

  const orphaned: Array<{ item: T; originalGroup: string }> = []
  for (const group of rawGroups) {
    // Group was intentionally deleted — do not recover its items
    if (!incomingGroupNames.has(group.name))
      continue

    for (const item of ((group[itemsKey] as T[]) ?? [])) {
      if (!incomingItemNames.has(item.name)) {
        orphaned.push({ item, originalGroup: group.name })
        console.warn(`[guard] "${item.name}" from group "${group.name}" is missing from reorderGroups payload — recovering it`)
      }
    }
  }

  if (!orphaned.length) {
    return incoming
  }

  const result = incoming.map(g => ({ ...g, [itemsKey]: [...((g[itemsKey] as T[]) ?? [])] }))

  for (const { item, originalGroup } of orphaned) {
    const target = result.find(g => g.name === originalGroup)
    if (target) {
      (target[itemsKey] as T[]).push(item)
    }
    else {
      console.error(`[guard] Cannot recover "${item.name}": original group "${originalGroup}" no longer exists`)
    }
  }

  return result
}
