import { getActiveFields } from '../../utils/widget-fields'

let sidCache: { sid: string; at: number } | null = null
const SID_TTL = 4 * 60 * 1000

async function getSid(base: string, password: string): Promise<string> {
  if (sidCache && Date.now() - sidCache.at < SID_TTL) return sidCache.sid
  const res = await $fetch<{ session: { sid: string } }>(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password },
  })
  const sid = res.session?.sid
  if (!sid) throw createError({ statusCode: 401, message: 'Pi-hole login failed' })
  sidCache = { sid, at: Date.now() }
  return sid
}

export default defineEventHandler(async (event) => {
  const { url, password } = getQuery(event) as Record<string, string>
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  const base = url.replace(/\/admin\/?$/, '').replace(/\/$/, '')
  const sid = await getSid(base, password ?? '')
  const headers = { 'X-FTL-SID': sid }

  const [summary, recentRes] = await Promise.all([
    $fetch<{ queries: { total: number; blocked: number; percent_blocked: number; forwarded: number; cached: number; unique_domains: number } }>(`${base}/api/stats/summary`, { headers }),
    $fetch<{ blocked: string[] }>(`${base}/api/stats/recent_blocked`, { headers }).catch(() => ({ blocked: [] })),
  ])

  const q = summary.queries
  const allFields = [
    { label: 'Queries', value: q.total },
    { label: 'Blocked', value: `${q.blocked} (${q.percent_blocked.toFixed(1)}%)` },
    { label: 'Forwarded', value: q.forwarded },
    { label: 'Cached', value: q.cached },
    { label: 'Domains', value: q.unique_domains },
    { label: 'Recent blocked', value: recentRes.blocked?.[0] ?? '—' },
  ]

  const active = getActiveFields('pihole', allFields.map(f => f.label))
  return { type: 'pihole', fields: allFields.filter(f => active.has(f.label)) }
})
