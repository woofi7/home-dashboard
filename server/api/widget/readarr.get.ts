import { getActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

export const meta = { name: 'Readarr', authType: 'query', displayLabels: ['Books', 'Missing', 'Authors', 'Queue'] } as const

export async function fetchReadarr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey) return null

  const base = url.replace(/\/$/, '')
  const key = `apikey=${encodeURIComponent(apiKey)}`

  const [books, wanted, authors, queue] = await Promise.all([
    $fetch<unknown[]>(`${base}/api/v1/book?${key}`),
    $fetch<{ totalRecords: number }>(`${base}/api/v1/wanted/missing?${key}`),
    $fetch<unknown[]>(`${base}/api/v1/author?${key}`),
    $fetch<{ totalRecords: number }>(`${base}/api/v1/queue?${key}`),
  ])

  const allFields = [
    { label: 'Books',   value: books.length },
    { label: 'Missing', value: wanted.totalRecords },
    { label: 'Authors', value: authors.length },
    { label: 'Queue',   value: queue.totalRecords },
  ]

  const active = getActiveFields('readarr', allFields.map(f => f.label))
  return { type: 'readarr', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchReadarr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey) throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchReadarr(creds)
})
