import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/uptimekuma'
export const meta = definition

type LoginRes = { token: string; tokenRequired?: boolean }
type Heartbeat = { status: number; time: string; msg?: string }
type Monitor = { id: number; name: string; active: boolean | number }
type MonitorsRes = { monitors: Record<string, Monitor> | Monitor[] }
type HeartbeatsRes = { heartbeats: Record<string, Heartbeat[]> }
type UptimeRes = { uptimeList: Record<string, number> }

export async function fetchUptimekuma(creds: ServiceCredentials) {
  const { url, username, password } = creds
  if (!url || !username || !password)
    return null

  const base = url.replace(/\/$/, '')

  const auth = await $fetch<LoginRes>(`${base}/api/login/access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username, password }).toString(),
  })

  if (!auth.token || auth.tokenRequired)
    return null

  const headers = { Authorization: `Bearer ${auth.token}` }

  const res = await $fetch<MonitorsRes>(`${base}/api/monitors`, { headers })
  const monitors = Array.isArray(res.monitors)
    ? res.monitors
    : Object.values(res.monitors ?? {})

  const active = monitors.filter(m => !!m.active)
  const paused = monitors.filter(m => !m.active).length

  // fetch latest heartbeat per monitor for up/down status
  let up = 0
  let down = 0
  let lastDownName = '—'
  let lastDownTime = 0

  try {
    const hbRes = await $fetch<HeartbeatsRes>(`${base}/api/heartbeats`, { headers })
    const heartbeats = hbRes.heartbeats ?? {}

    for (const m of active) {
      const beats = heartbeats[String(m.id)] ?? []
      const latest = beats[0]
      if (!latest)
        continue
      if (latest.status === 1)
        up++
      else if (latest.status === 0) {
        down++
        const t = new Date(latest.time).getTime()
        if (t > lastDownTime) {
          lastDownTime = t
          lastDownName = m.name
        }
      }
    }
  } catch {
    // heartbeat endpoint unavailable — count active as up
    up = active.length
  }

  // fetch uptime percentages (fraction 0-1)
  let avgUptime = '—'
  try {
    const ids = active.map(m => m.id).join(',')
    const uRes = await $fetch<UptimeRes>(`${base}/api/monitor/uptimelist?ids=${ids}`, { headers })
    const vals = active
      .map(m => uRes.uptimeList[`${m.id}_24`])
      .filter((v): v is number => v !== undefined)
    if (vals.length)
      avgUptime = `${((vals.reduce((a, b) => a + b, 0) / vals.length) * 100).toFixed(1)}%`
  } catch {
    // uptime endpoint unavailable
  }

  const allFields = [
    { label: 'Monitors',  value: monitors.length },
    { label: 'Up',        value: up },
    { label: 'Down',      value: down },
    { label: 'Paused',    value: paused },
    { label: 'Uptime',    value: avgUptime },
    { label: 'Last Down', value: lastDownName },
  ]

  return { type: 'uptimekuma', fields: getOrderedActiveFields('uptimekuma', allFields) }
}

export { fetchUptimekuma as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.username)
    throw createError({ statusCode: 400, message: 'username is required' })
  if (!creds.password)
    throw createError({ statusCode: 400, message: 'password is required' })
  return fetchUptimekuma(creds)
})
