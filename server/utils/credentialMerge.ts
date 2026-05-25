import type { Service, ServiceGroup } from '../types'

export const CRED_FIELDS = ['apiKey', 'username', 'password', 'token', 'key', 'secret']

/**
 * After a reorderGroups save, incoming services carry only safe fields
 * (stripped by config.get.ts). This merges raw YAML data back so saves
 * never wipe credentials or other non-safe fields (e.g. docker server).
 *
 * Uses a flat lookup across ALL groups so cross-group moves are handled
 * correctly: a service moved from group A to group B still finds its raw
 * data even though the raw YAML still has it listed under group A.
 *
 * Strategy: raw service as base (all fields preserved), incoming (safe
 * fields only) applied on top to capture user edits such as URL changes.
 */
export function preserveCredentials(rawGroups: ServiceGroup[], incoming: ServiceGroup[]): ServiceGroup[] {
  const allRaw = new Map<string, Service>(
    rawGroups.flatMap(g => g.services.map(s => [s.name, s]))
  )

  return incoming.map(group => ({
    ...group,
    services: group.services.map(s => {
      const raw = allRaw.get(s.name)
      if (!raw)
        return s
      return { ...raw, ...s }
    }),
  }))
}
