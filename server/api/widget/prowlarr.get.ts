import { getActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

type IndexerStats = { numberOfGrabs: number; numberOfQueries: number; numberOfFailedQueries: number }

export const meta = { name: 'Prowlarr', authType: 'query', displayLabels: ['Indexers', 'Grabs', 'Queries', 'Failures'] } as const

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

  const active = getActiveFields('prowlarr', allFields.map(f => f.label))
  return { type: 'prowlarr', fields: allFields.filter(f => active.has(f.label)) }
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
