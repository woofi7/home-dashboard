import { getActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

export const meta = { name: 'Bazarr', authType: 'header', displayLabels: ['Missing episodes', 'Missing movies', 'Providers'] } as const

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

  const active = getActiveFields('bazarr', allFields.map(f => f.label))
  return { type: 'bazarr', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchBazarr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchBazarr(creds)
})
