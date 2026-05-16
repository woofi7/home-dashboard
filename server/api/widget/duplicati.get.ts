import { getActiveFields } from '../../utils/widget-fields'

function fmtBytes(n: number): string {
  if (n >= 1024 ** 4) return `${(n / 1024 ** 4).toFixed(1)} TB`
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

export default defineEventHandler(async (event) => {
  const { url, password } = getQuery(event) as Record<string, string>
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  const base = url.replace(/\/$/, '')

  const loginRes = await $fetch<{ AccessToken?: string }>(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { Password: password ?? '' },
  })

  const token = loginRes.AccessToken
  if (!token) throw createError({ statusCode: 401, message: 'Duplicati login failed' })

  const authHeaders = { Authorization: `Bearer ${token}` }

  const [backups, serverState] = await Promise.all([
    $fetch<Array<{ Backup?: { Metadata?: Record<string, string> }; Schedule?: { Time?: string; AllowedDays?: string[] } }>>(`${base}/api/v1/backups`, { headers: authHeaders }),
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

    const lastSuccess = meta.LastBackupDate ? new Date(meta.LastBackupDate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')) : null
    const lastError = meta.LastErrorDate ? new Date(meta.LastErrorDate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')) : null

    if (lastSuccess && !isNaN(lastSuccess.getTime())) {
      const jobHasError = lastError && !isNaN(lastError.getTime()) && lastError > lastSuccess
      if (!lastBackupDate || lastSuccess > lastBackupDate) {
        lastBackupDate = lastSuccess
        lastBackupOk = !jobHasError
      }
    }
  }

  const activeTasks = (serverState.ActiveTask ? 1 : 0) + (serverState.SchedulerQueueIds?.length ?? 0)

  const lastStr = lastBackupDate
    ? lastBackupDate.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (lastBackupOk ? '' : ' ✕')
    : '—'

  const allFields = [
    { label: 'Last backup', value: lastStr },
    { label: 'Jobs', value: backups.length },
    { label: 'Active', value: activeTasks },
    { label: 'Source', value: fmtBytes(totalSourceSize) },
    { label: 'Dest', value: fmtBytes(totalDestSize) },
  ]

  const active = getActiveFields('duplicati', allFields.map(f => f.label))
  return { type: 'duplicati', fields: allFields.filter(f => active.has(f.label)) }
})
