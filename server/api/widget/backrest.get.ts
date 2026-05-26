import type { ServiceCredentials } from '../../utils/auth'
import { formatBytes } from '../../utils/formatBytes'

import definition from '#shared/widgetDefinitions/backrest'
export const meta = definition

const CONNECT_HEADERS = {
  'Content-Type': 'application/json',
  'Connect-Protocol-Version': '1',
}

function buildHeaders(creds: ServiceCredentials): Record<string, string> {
  const headers: Record<string, string> = { ...CONNECT_HEADERS }
  if (creds.username && creds.password) {
    const token = Buffer.from(`${creds.username}:${creds.password}`).toString('base64')
    headers['Authorization'] = `Basic ${token}`
  }
  return headers
}

function formatAge(ms: number): string {
  const diffMs = Date.now() - ms
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60)
    return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)
    return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

type Repo = { id?: string; guid?: string }
type ConfigResponse = { repos?: Repo[] }

type RecentBackups = { timestampMs?: string[]; status?: string[] }
type Summary = { id?: string; recentBackups?: RecentBackups }
type DashboardResponse = { repoSummaries?: Summary[] }

type Operation = {
  unixTimeStartMs?: string
  status?: string
  operationStats?: { stats?: { totalSize?: string; snapshotCount?: string } }
  operationBackup?: unknown
}
type OperationsResponse = { operations?: Operation[] }

export async function fetchBackrest(creds: ServiceCredentials) {
  const { url } = creds
  if (!url)
    return null

  const base = url.replace(/\/$/, '')
  const headers = buildHeaders(creds)

  const post = <T>(path: string) =>
    $fetch<T>(`${base}${path}`, { method: 'POST', headers, body: {} })

  const [config, dashboard] = await Promise.all([
    post<ConfigResponse>('/v1.Backrest/GetConfig'),
    post<DashboardResponse>('/v1.Backrest/GetSummaryDashboard'),
  ])

  const repos = config.repos ?? []
  if (repos.length === 0)
    return { type: 'backrest', fields: [{ label: 'Repos', value: 'None configured' }] }

  const repoSummaryMap = new Map(
    (dashboard.repoSummaries ?? []).map(s => [s.id ?? '', s]),
  )

  const fields: { label: string; value: unknown }[] = []

  await Promise.all(repos.map(async (repo) => {
    const id = repo.id ?? '?'
    const guid = repo.guid

    let lastBackupStr = 'Never'
    let totalSize: string | null = null
    let snapshotCount: string | null = null

    const summary = repoSummaryMap.get(id)
    const timestamps = summary?.recentBackups?.timestampMs ?? []
    const statuses = summary?.recentBackups?.status ?? []
    if (timestamps.length > 0) {
      const latestMs = Math.max(...timestamps.map(Number))
      const latestIdx = timestamps.findIndex(t => Number(t) === latestMs)
      const ok = statuses[latestIdx] === 'STATUS_SUCCESS'
      lastBackupStr = `${formatAge(latestMs)}${ok ? '' : ' (failed)'}`
    }

    if (guid) {
      const ops = await $fetch<OperationsResponse>(`${base}/v1.Backrest/GetOperations`, {
        method: 'POST',
        headers,
        body: { selector: { repoGuid: guid }, lastN: 50 },
      })
      const statsOp = (ops.operations ?? []).findLast(op => op.operationStats != null)
      if (statsOp?.operationStats?.stats) {
        const stats = statsOp.operationStats.stats
        if (stats.totalSize)
          totalSize = formatBytes(Number(stats.totalSize))
        if (stats.snapshotCount)
          snapshotCount = stats.snapshotCount
      }
    }

    const prefix = repos.length > 1 ? `${id}: ` : ''
    fields.push({ label: `${prefix}Last backup`, value: lastBackupStr })
    fields.push({ label: `${prefix}Snapshots`, value: snapshotCount ?? '—' })
    fields.push({ label: `${prefix}Disk size`, value: totalSize ?? '—' })
  }))

  return { type: 'backrest', fields }
}

export { fetchBackrest as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  return fetchBackrest(creds)
})
