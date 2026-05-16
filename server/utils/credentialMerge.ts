import type { Service, ServiceGroup } from '../types'

export const CRED_FIELDS = ['apiKey', 'username', 'password', 'token', 'key', 'secret']

/**
 * After a reorderGroups save, incoming services are missing credentials
 * (stripped by config.get.ts). This merges them back from the raw YAML
 * so a save never wipes stored keys/passwords for unedited services.
 *
 * Rule: if the incoming field is absent (undefined) or empty string,
 * restore the raw value. Non-empty incoming values take precedence.
 */
export function preserveCredentials(rawGroups: ServiceGroup[], incoming: ServiceGroup[]): ServiceGroup[] {
  const rawByName = new Map(rawGroups.map(g => [g.name, g]))
  return incoming.map(group => {
    const raw = rawByName.get(group.name)
    if (!raw) return group
    const rawByService = new Map(raw.services.map(s => [s.name, s]))
    return {
      ...group,
      services: group.services.map(s => {
        const rawSvc = rawByService.get(s.name)
        if (!rawSvc) return s
        const merged: Service = { ...s }
        for (const field of CRED_FIELDS) {
          const inVal = s[field]
          const exVal = rawSvc[field]
          if ((inVal === undefined || inVal === '') && exVal !== undefined && exVal !== null) {
            merged[field] = exVal
          }
        }
        return merged
      }),
    }
  })
}
