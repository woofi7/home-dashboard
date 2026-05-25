import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/beszel'
export const meta = definition

type SystemInfo = { cpu?: number; mp?: number; dp?: number }
type SystemRecord = { status: string; info?: SystemInfo | string }
type PbAuthRes = { token: string }
type PbListRes = { items: SystemRecord[] }

async function authenticate(base: string, username: string, password: string): Promise<string> {
  const body = { identity: username, password }

  try {
    const res = await $fetch<PbAuthRes>(`${base}/api/collections/users/auth-with-password`, {
      method: 'POST',
      body,
    })
    return res.token
  } catch {
    // fall back to superuser auth (admin accounts)
  }

  const res = await $fetch<PbAuthRes>(`${base}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    body,
  })
  return res.token
}

export async function fetchBeszel(creds: ServiceCredentials) {
  const { url, username, password } = creds
  if (!url || !username || !password)
    return null

  const base = url.replace(/\/$/, '')

  const token = await authenticate(base, username, password)
  const headers = { Authorization: `Bearer ${token}` }

  const res = await $fetch<PbListRes>(`${base}/api/collections/systems/records?perPage=500`, { headers })
  const systems = res.items ?? []

  const up   = systems.filter(s => s.status === 'up').length
  const down = systems.filter(s => s.status !== 'up' && s.status !== 'paused').length

  const infos = systems.map(s => {
    if (!s.info)
      return {} as SystemInfo
    return typeof s.info === 'string' ? JSON.parse(s.info) as SystemInfo : s.info
  })

  const avg = (key: keyof SystemInfo) => {
    const vals = infos.map(i => i[key] ?? 0).filter((v): v is number => v > 0)
    if (!vals.length)
      return '—'
    return `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}%`
  }

  const allFields = [
    { label: 'Systems', value: systems.length },
    { label: 'Up',      value: up },
    { label: 'Down',    value: down },
    { label: 'Avg CPU', value: avg('cpu') },
    { label: 'Avg Mem', value: avg('mp') },
  ]

  return { type: 'beszel', fields: getOrderedActiveFields('beszel', allFields) }
}

export { fetchBeszel as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.username)
    throw createError({ statusCode: 400, message: 'username is required' })
  if (!creds.password)
    throw createError({ statusCode: 400, message: 'password is required' })
  return fetchBeszel(creds)
})
