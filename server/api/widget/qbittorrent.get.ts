import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'
import { formatSpeed } from '../../utils/formatBytes'

import definition from '#shared/widgetDefinitions/qbittorrent'
export const meta = definition


async function login(base: string, username: string, password: string): Promise<string> {
  let cookie = ''
  await $fetch<void>(`${base}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    onResponse({ response }) {
      const raw = response.headers.get('set-cookie') ?? ''
      // qBittorrent 5.1.x uses SID, 5.2.x uses QBT_SID_<port>
      const match = raw.match(/(QBT_SID_\d+|SID)=([^;]+)/)
      if (match)
        cookie = `${match[1]}=${match[2]}`
    },
  })
  return cookie
}

export async function fetchQbittorrent(creds: ServiceCredentials) {
  const { url, username, password } = creds
  if (!url)
    return null

  const base = url.replace(/\/$/, '')
  const cookie = await login(base, username ?? '', password ?? '')
  if (!cookie)
    return null

  const headers = { Cookie: cookie }
  const [torrents, transfer] = await Promise.all([
    $fetch<Array<{ state: string }>>(`${base}/api/v2/torrents/info`, { headers }),
    $fetch<{ dl_info_speed: number; up_info_speed: number; dl_rate_limit: number; up_rate_limit: number }>(`${base}/api/v2/transfer/info`, { headers }),
  ])

  const allFields = [
    { label: 'Total',    value: torrents.length },
    { label: 'Active',   value: torrents.filter(t => t.state === 'downloading').length },
    { label: 'DL Speed', value: formatSpeed(transfer.dl_info_speed, transfer.dl_rate_limit) },
    { label: 'UL Speed', value: formatSpeed(transfer.up_info_speed, transfer.up_rate_limit) },
  ]

  return { type: 'qbittorrent', fields: getOrderedActiveFields('qbittorrent', allFields) }
}

export { fetchQbittorrent as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchQbittorrent, ['url']))
