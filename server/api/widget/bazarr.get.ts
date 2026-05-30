import { widgetEndpoint } from '../../utils/widgetError'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/bazarr'
export const meta = definition


export async function fetchBazarr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const headers = { 'X-API-KEY': apiKey }

  const [badges, providers] = await Promise.all([
    $fetch<{ episodes: number; movies: number }>(`${base}/api/badges`, { headers }),
    $fetch<{ data: unknown[] }>(`${base}/api/providers`, { headers }),
  ])

  const allFields = [
    { label: 'Missing episodes', value: badges.episodes },
    { label: 'Missing movies',   value: badges.movies },
    { label: 'Providers',        value: providers.data.length },
  ]

  return { type: 'bazarr', fields: getOrderedActiveFields('bazarr', allFields) }
}

export { fetchBazarr as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchBazarr, ['url', 'apiKey']))
