import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/readarr'
export const meta = definition


export async function fetchReadarr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

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

  return { type: 'readarr', fields: getOrderedActiveFields('readarr', allFields) }
}

export { fetchReadarr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchReadarr(creds)
})
