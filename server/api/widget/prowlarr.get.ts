import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/prowlarr'
export const meta = definition

type IndexerStats = { numberOfGrabs: number; numberOfQueries: number; numberOfFailedQueries: number }


export async function fetchProwlarr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const key = `apikey=${encodeURIComponent(apiKey)}`

  const [indexer, stats] = await Promise.all([
    $fetch<unknown[]>(`${base}/api/v1/indexer?${key}`),
    $fetch<{ indexers: IndexerStats[] }>(`${base}/api/v1/indexerstats?${key}`),
  ])

  const sum = (field: keyof IndexerStats) => stats.indexers.reduce((acc, i) => acc + i[field], 0)

  const allFields = [
    { label: 'Indexers',  value: indexer.length },
    { label: 'Grabs',     value: sum('numberOfGrabs') },
    { label: 'Queries',   value: sum('numberOfQueries') },
    { label: 'Failures',  value: sum('numberOfFailedQueries') },
  ]

  return { type: 'prowlarr', fields: getOrderedActiveFields('prowlarr', allFields) }
}

export { fetchProwlarr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchProwlarr(creds)
})
