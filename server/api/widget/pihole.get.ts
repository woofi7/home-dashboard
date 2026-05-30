import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import { createCache } from '../../utils/cache'

import definition from '#shared/widgetDefinitions/pihole'
export const meta = definition

const sidCache = createCache<string>()
const SID_TTL = 4 * 60 * 1000

async function getSid(base: string, password: string): Promise<string> {
  return sidCache.fetch(async () => {
    const res = await $fetch<{ session: { sid: string } }>(`${base}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { password },
    })
    const sid = res.session?.sid
    if (!sid)
      throw new Error('Pi-hole login failed')
    return sid
  }, SID_TTL)
}


export async function fetchPihole(creds: ServiceCredentials) {
  const { url, password } = creds
  if (!url)
    return null

  const base = url.replace(/\/admin\/?$/, '').replace(/\/$/, '')
  const sid = await getSid(base, password ?? '')
  const headers = { 'X-FTL-SID': sid }

  const [summary, recentRes] = await Promise.all([
    $fetch<{ queries: { total: number; blocked: number; percent_blocked: number; forwarded: number; cached: number; unique_domains: number } }>(`${base}/api/stats/summary`, { headers }),
    $fetch<{ blocked: string[] }>(`${base}/api/stats/recent_blocked`, { headers }).catch(() => ({ blocked: [] })),
  ])

  const q = summary.queries
  const allFields = [
    { label: 'Queries',        value: q.total },
    { label: 'Blocked',        value: `${q.blocked} (${q.percent_blocked.toFixed(1)}%)` },
    { label: 'Forwarded',      value: q.forwarded },
    { label: 'Cached',         value: q.cached },
    { label: 'Domains',        value: q.unique_domains },
    { label: 'Recent blocked', value: recentRes.blocked?.[0] ?? '—' },
  ]

  return { type: 'pihole', fields: getOrderedActiveFields('pihole', allFields) }
}

export { fetchPihole as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchPihole, ['url']))
