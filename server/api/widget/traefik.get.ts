import { getActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

type TraefikOverview = { http: { routers: { total: number }; services: { total: number }; middlewares: { total: number } } }

export async function fetchTraefik(creds: ServiceCredentials) {
  const { url, username, password } = creds
  if (!url) return null

  const base = url.replace(/\/$/, '')
  const headers = username && password
    ? { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` }
    : {}

  const overview = await $fetch<TraefikOverview>(`${base}/api/overview`, { headers })

  const allFields = [
    { label: 'Routers',     value: overview.http.routers.total },
    { label: 'Services',    value: overview.http.services.total },
    { label: 'Middlewares', value: overview.http.middlewares.total },
  ]

  const active = getActiveFields('traefik', allFields.map(f => f.label))
  return { type: 'traefik', fields: allFields.filter(f => active.has(f.label)) }
}

export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url) throw createError({ statusCode: 400, message: 'url is required' })
  return fetchTraefik(creds)
})
