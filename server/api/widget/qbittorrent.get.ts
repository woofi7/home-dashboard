import { getActiveFields } from '../../utils/widget-fields'

function fmt(bps: number): string {
  if (bps >= 1024 ** 3) return `${(bps / 1024 ** 3).toFixed(2)} GB/s`
  if (bps >= 1024 ** 2) return `${(bps / 1024 ** 2).toFixed(2)} MB/s`
  if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  return `${bps} B/s`
}

function fmtSpeed(speed: number, limit: number): string {
  return limit > 0 ? `${fmt(speed)} / ${fmt(limit)}` : fmt(speed)
}

export default defineEventHandler(async (event) => {
  const { url, username, password } = getQuery(event) as Record<string, string>
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  const base = url.replace(/\/$/, '')

  const loginRes = await $fetch.raw(`${base}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(username ?? '')}&password=${encodeURIComponent(password ?? '')}`,
  })
  const setCookie = loginRes.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/SID=([^;]+)/)
  if (!match) throw createError({ statusCode: 401, message: 'qBittorrent login failed' })
  const cookie = `SID=${match[1]}`
  const headers = { Cookie: cookie }

  const [torrents, transfer] = await Promise.all([
    $fetch<Array<{ state: string }>>(`${base}/api/v2/torrents/info`, { headers }),
    $fetch<{ dl_info_speed: number; up_info_speed: number; dl_rate_limit: number; up_rate_limit: number }>(`${base}/api/v2/transfer/info`, { headers }),
  ])

  const allFields = [
    { label: 'Total', value: torrents.length },
    { label: 'Active', value: torrents.filter(t => t.state === 'downloading').length },
    { label: 'DL Speed', value: fmtSpeed(transfer.dl_info_speed, transfer.dl_rate_limit) },
    { label: 'UL Speed', value: fmtSpeed(transfer.up_info_speed, transfer.up_rate_limit) },
  ]

  const active = getActiveFields('qbittorrent', allFields.map(f => f.label))
  return { type: 'qbittorrent', fields: allFields.filter(f => active.has(f.label)) }
})
