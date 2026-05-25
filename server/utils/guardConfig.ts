/**
 * For reorderGroups operations: ensure no items are silently dropped due to
 * frontend bugs (e.g. drag-and-drop state desync). Any item present in the
 * raw YAML but absent from the incoming payload is recovered back into its
 * original group (or the first available group if the original was deleted).
 */
export function recoverOrphanedItems<T extends { name: string }>(
  rawGroups: Array<{ name: string; [key: string]: unknown }>,
  incoming: Array<{ name: string; [key: string]: unknown }>,
  itemsKey: string,
): Array<{ name: string; [key: string]: unknown }> {
  const incomingNames = new Set(
    incoming.flatMap(g => ((g[itemsKey] as T[]) ?? []).map((i: T) => i.name)),
  )

  const orphaned: Array<{ item: T; originalGroup: string }> = []
  for (const group of rawGroups) {
    for (const item of ((group[itemsKey] as T[]) ?? [])) {
      if (!incomingNames.has(item.name)) {
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
    const target = result.find(g => g.name === originalGroup) ?? result[0]
    if (target) {
      (target[itemsKey] as T[]).push(item)
    }
    else {
      console.error(`[guard] Cannot recover "${item.name}": no groups remain in incoming payload`)
    }
  }

  return result
}
