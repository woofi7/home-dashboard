import { getActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

type TdarrStats = { totalFileCount: number; table2Count: number; tdarrScore: number }

export const meta = { name: 'Tdarr', authType: 'none', displayLabels: ['Files', 'Done', 'Score'] } as const

export async function fetchTdarr(creds: ServiceCredentials) {
  const { url } = creds
  if (!url) return null

  const base = url.replace(/\/$/, '')

  const stats = await $fetch<TdarrStats[]>(`${base}/api/v2/cruddb`, {
    method: 'POST',
    body: { data: { collection: 'StatisticsJSONDB', mode: 'getAll', docID: 'statistics' } },
  })

  const s = stats[0]
  if (!s) return null

  const allFields = [
    { label: 'Files', value: s.totalFileCount },
    { label: 'Done',  value: s.table2Count },
    { label: 'Score', value: s.tdarrScore, suffix: '%' },
  ]

  const active = getActiveFields('tdarr', allFields.map(f => f.label))
  return { type: 'tdarr', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchTdarr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url) throw createError({ statusCode: 400, message: 'url is required' })
  return fetchTdarr(creds)
})
