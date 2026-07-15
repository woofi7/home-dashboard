import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import { formatBytes } from '../../utils/formatBytes'

import definition from '#shared/widgetDefinitions/kopia'
export const meta = definition

type SnapshotStats = {
  totalSize?: number
  errorCount?: number
}

type Source = {
  source?: { host?: string; userName?: string; path?: string }
  status?: string
  lastSnapshot?: {
    endTime?: string
    stats?: SnapshotStats
  } | null
}

type SourcesResponse = { sources?: Source[] }
type TasksSummaryResponse = Record<string, number>

function buildAuthHeader(creds: ServiceCredentials): Record<string, string> {
  const headers: Record<string, string> = {}
  if (creds.username && creds.password) {
    const token = Buffer.from(`${creds.username}:${creds.password}`).toString('base64')
    headers['Authorization'] = `Basic ${token}`
  }
  return headers
}

// Kopia's server API rejects every /api/v1/* call - including plain GETs -
// unless the request carries both the session cookie issued at login and a
// matching X-Kopia-Csrf-Token header. That token isn't a fixed value: it's
// embedded per-session in the index page's <meta name="kopia-csrf-token">
// tag, which the official web UI reads and replays the same way. So we log
// in first to collect both, then use them on the real API calls.
async function login(base: string, authHeader: Record<string, string>): Promise<Record<string, string>> {
  const res = await $fetch.raw(`${base}/`, { headers: authHeader, responseType: 'text' })
  const html = res._data as string
  const csrfToken = html.match(/name="kopia-csrf-token" content="([^"]+)"/)?.[1]
  if (!csrfToken)
    throw new Error('Kopia did not return a CSRF token - unexpected login page')

  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map(c => c.split(';')[0])
    .join('; ')

  return { ...authHeader, Cookie: cookie, 'X-Kopia-Csrf-Token': csrfToken }
}

export async function fetchKopia(creds: ServiceCredentials) {
  const { url } = creds
  if (!url)
    return null

  const base = url.replace(/\/$/, '')
  const headers = await login(base, buildAuthHeader(creds))

  const [sourcesRes, tasksRes] = await Promise.all([
    $fetch<SourcesResponse>(`${base}/api/v1/sources`, { headers }),
    $fetch<TasksSummaryResponse>(`${base}/api/v1/tasks-summary`, { headers }).catch(() => ({})),
  ])

  const sources = sourcesRes.sources ?? []

  let totalSize = 0
  let errorSources = 0
  let lastBackupDate: Date | null = null
  let lastBackupOk = true

  for (const src of sources) {
    const stats = src.lastSnapshot?.stats
    if (stats?.totalSize)
      totalSize += stats.totalSize
    if (stats?.errorCount)
      errorSources += 1

    const endTime = src.lastSnapshot?.endTime ? new Date(src.lastSnapshot.endTime) : null
    if (endTime && !isNaN(endTime.getTime()) && (!lastBackupDate || endTime > lastBackupDate)) {
      lastBackupDate = endTime
      lastBackupOk = !stats?.errorCount
    }
  }

  const activeTasks = typeof tasksRes.RUNNING === 'number'
    ? tasksRes.RUNNING
    : sources.filter(s => s.status && s.status !== 'IDLE').length

  const lastStr = lastBackupDate
    ? lastBackupDate.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (lastBackupOk ? '' : ' ✕')
    : '—'

  const allFields = [
    { label: 'Last backup', value: lastStr },
    { label: 'Sources',     value: sources.length },
    { label: 'Active',      value: activeTasks },
    { label: 'Size',        value: formatBytes(totalSize) },
    { label: 'Errors',      value: errorSources },
  ]

  return { type: 'kopia', fields: getOrderedActiveFields('kopia', allFields) }
}

export { fetchKopia as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchKopia, ['url']))
