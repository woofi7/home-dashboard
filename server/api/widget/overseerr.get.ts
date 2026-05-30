import { widgetEndpoint } from '../../utils/widgetError'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/overseerr'
export const meta = definition

type PageResult = { pageInfo: { results: number } }


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

  return { type: 'overseerr', fields: getOrderedActiveFields('overseerr', allFields) }
}

export { fetchOverseerr as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchOverseerr, ['url', 'apiKey']))
