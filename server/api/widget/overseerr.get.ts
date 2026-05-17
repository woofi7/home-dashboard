import { getActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

type PageResult = { pageInfo: { results: number } }

export const meta = { name: 'Overseerr', authType: 'header', displayLabels: ['Requests', 'Pending', 'Approved', 'Available', 'Processing', 'Media'] } as const

export async function fetchOverseerr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const headers = { 'X-Api-Key': apiKey }

  const [requests, pending, approved, available, processing, media] = await Promise.all([
    $fetch<PageResult>(`${base}/api/v1/request?take=1&filter=all`, { headers }),
    $fetch<PageResult>(`${base}/api/v1/request?take=1&filter=pending`, { headers }),
    $fetch<PageResult>(`${base}/api/v1/request?take=1&filter=approved`, { headers }),
    $fetch<PageResult>(`${base}/api/v1/media?take=1&filter=available`, { headers }),
    $fetch<PageResult>(`${base}/api/v1/request?take=1&filter=processing`, { headers }),
    $fetch<PageResult>(`${base}/api/v1/media?take=1`, { headers }),
  ])

  const allFields = [
    { label: 'Requests',   value: requests.pageInfo.results },
    { label: 'Pending',    value: pending.pageInfo.results },
    { label: 'Approved',   value: approved.pageInfo.results },
    { label: 'Available',  value: available.pageInfo.results },
    { label: 'Processing', value: processing.pageInfo.results },
    { label: 'Media',      value: media.pageInfo.results },
  ]

  const active = getActiveFields('overseerr', allFields.map(f => f.label))
  return { type: 'overseerr', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchOverseerr as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchOverseerr(creds)
})
