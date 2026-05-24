import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/radarr'
export const meta = definition


export async function fetchRadarr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const key = `apikey=${encodeURIComponent(apiKey)}`

  const [movies, queueStatus, wanted] = await Promise.all([
    $fetch<Array<{ hasFile: boolean }>>(`${base}/api/v3/movie?${key}`),
    $fetch<{ totalCount: number }>(`${base}/api/v3/queue/status?${key}`),
    $fetch<{ totalRecords: number }>(`${base}/api/v3/wanted/missing?${key}`),
  ])

  const allFields = [
    { label: 'Movies',     value: movies.length },
    { label: 'Downloaded', value: movies.filter(m => m.hasFile).length },
    { label: 'Queued',     value: queueStatus.totalCount },
    { label: 'Missing',    value: wanted.totalRecords },
  ]

  return { type: 'radarr', fields: getOrderedActiveFields('radarr', allFields) }
}

export { fetchRadarr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchRadarr(creds)
})
