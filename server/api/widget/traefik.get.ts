import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/traefik'
export const meta = definition

type TraefikOverview = { http: { routers: { total: number }; services: { total: number }; middlewares: { total: number } } }


export async function fetchTraefik(creds: ServiceCredentials) {
  const { url, username, password } = creds
  if (!url)
    return null

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

  return { type: 'traefik', fields: getOrderedActiveFields('traefik', allFields) }
}

export { fetchTraefik as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  return fetchTraefik(creds)
})
