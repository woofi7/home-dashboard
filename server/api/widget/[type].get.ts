import { getWidgetDef } from '../../utils/widget-registry'
import { fetchWidget } from '../../utils/fetchWidget'
import { loadConfig } from '../../utils/config'
import { CRED_FIELDS } from '../../utils/credentialMerge'
import type { ServiceGroup } from '../../types'

// Short-lived cache so repeated widget calls in the same refresh cycle
// don't each re-read services.yaml from disk
const TTL = 10_000
let cachedGroups: ServiceGroup[] | null = null
let cachedAt = 0

function getServiceGroups(): ServiceGroup[] {
  if (!cachedGroups || Date.now() - cachedAt > TTL) {
    cachedGroups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
    cachedAt = Date.now()
  }
  return cachedGroups
}

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')!
  const query = getQuery(event) as Record<string, string>

  if (!query.url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!getWidgetDef(type)) throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  // Look up credentials from server config by URL; never trust client-supplied credential params
  const groups = getServiceGroups()
  const service = groups.flatMap(g => g.services).find(s => s.url === query.url)
  const serverCreds: Record<string, string> = {}
  if (service) {
    for (const field of CRED_FIELDS) {
      if (typeof service[field] === 'string') serverCreds[field] = service[field] as string
    }
  }

  // Pass url and non-credential query params through; credentials always come from server config
  const credSet = new Set(CRED_FIELDS)
  const safeQuery: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    if (!credSet.has(k)) safeQuery[k] = v
  }

  const result = await fetchWidget(type, { ...safeQuery, ...serverCreds })
  if (!result) throw createError({ statusCode: 500, message: 'Widget fetch failed' })
  return { type, ...result }
})
