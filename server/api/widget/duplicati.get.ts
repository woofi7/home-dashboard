import type { ServiceCredentials } from '../../utils/auth'
import { getActiveFields } from '../../utils/widget-fields'
import { formatBytes } from '../../utils/formatBytes'

export const meta = { name: 'Duplicati', authType: 'password', displayLabels: ['Last backup', 'Jobs', 'Active', 'Source', 'Dest'] } as const

export async function fetchDuplicati(creds: ServiceCredentials) {
  const { url, password } = creds
  if (!url) return null

  const base = url.replace(/\/$/, '')

  const loginRes = await $fetch<{ AccessToken?: string }>(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { Password: password ?? '' },
  })

  const token = loginRes.AccessToken
  if (!token) return null

  const authHeaders = { Authorization: `Bearer ${token}` }

  const [backups, serverState] = await Promise.all([
    $fetch<Array<{ Backup?: { Metadata?: Record<string, string> } }>>(`${base}/api/v1/backups`, { headers: authHeaders }),
    $fetch<{ ActiveTask?: unknown; SchedulerQueueIds?: unknown[] }>(`${base}/api/v1/serverstate`, { headers: authHeaders }).catch(() => ({})),
  ])

  let totalSourceSize = 0
  let totalDestSize = 0
  let lastBackupDate: Date | null = null
  let lastBackupOk = true

  for (const entry of backups) {
    const meta = entry?.Backup?.Metadata ?? {}
    const src = parseInt(meta.SourceFilesSize ?? '0', 10)
    const dst = parseInt(meta.TargetFilesSize ?? '0', 10)
    if (!isNaN(src)) totalSourceSize += src
    if (!isNaN(dst)) totalDestSize += dst

    const isoFix = (s: string) => s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')
    const lastSuccess = meta.LastBackupDate ? new Date(isoFix(meta.LastBackupDate)) : null
    const lastError = meta.LastErrorDate ? new Date(isoFix(meta.LastErrorDate)) : null

    if (lastSuccess && !isNaN(lastSuccess.getTime())) {
      const hasError = lastError && !isNaN(lastError.getTime()) && lastError > lastSuccess
      if (!lastBackupDate || lastSuccess > lastBackupDate) {
        lastBackupDate = lastSuccess
        lastBackupOk = !hasError
      }
    }
  }

  const activeTasks = (serverState.ActiveTask ? 1 : 0) + (serverState.SchedulerQueueIds?.length ?? 0)
  const lastStr = lastBackupDate
    ? lastBackupDate.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (lastBackupOk ? '' : ' ✕')
    : '—'

  const allFields = [
    { label: 'Last backup', value: lastStr },
    { label: 'Jobs',        value: backups.length },
    { label: 'Active',      value: activeTasks },
    { label: 'Source',      value: formatBytes(totalSourceSize) },
    { label: 'Dest',        value: formatBytes(totalDestSize) },
  ]

  const active = getActiveFields('duplicati', allFields.map(f => f.label))
  return { type: 'duplicati', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchDuplicati as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url) throw createError({ statusCode: 400, message: 'url is required' })
  return fetchDuplicati(creds)
})
