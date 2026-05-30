import { widgetEndpoint } from '../../utils/widgetError'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import type { ServiceCredentials } from '../../utils/auth'

import definition from '#shared/widgetDefinitions/sonarr'
export const meta = definition


export async function fetchSonarr(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const key = `apikey=${encodeURIComponent(apiKey)}`

  const [series, queue, wantedMissing, wantedCutoff] = await Promise.all([
    $fetch<Array<{ monitored: boolean }>>(`${base}/api/v3/series?${key}`),
    $fetch<{ totalRecords: number }>(`${base}/api/v3/queue?${key}`),
    $fetch<{ totalRecords: number }>(`${base}/api/v3/wanted/missing?${key}`),
    $fetch<{ totalRecords: number }>(`${base}/api/v3/wanted/cutoff?${key}`),
  ])

  const allFields = [
    { label: 'Series',       value: series.length },
    { label: 'Monitored',    value: series.filter(s => s.monitored).length },
    { label: 'Queued',       value: queue.totalRecords },
    { label: 'Wanted',       value: wantedMissing.totalRecords },
    { label: 'Cutoff unmet', value: wantedCutoff.totalRecords },
  ]

  return { type: 'sonarr', fields: getOrderedActiveFields('sonarr', allFields) }
}

export { fetchSonarr as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchSonarr, ['url', 'apiKey']))
