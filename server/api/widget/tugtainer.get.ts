import type { ServiceCredentials } from '../../utils/auth'
import definition from '#shared/widgetDefinitions/tugtainer'
export const meta = definition

type HostSummary = {
  host_id: number
  host_name: string
  host_enabled: boolean
  total_containers: number
  by_update_available: Record<string, number>
  total_images: number
  unused_images: number
  dangling_images: number
}

async function login(base: string, password: string): Promise<string> {
  let cookie = ''
  await $fetch<void>(`${base}/api/auth/password/login`, {
    method: 'POST',
    body: { password },
    onResponse({ response }) {
      const raw = response.headers.get('set-cookie') ?? ''
      const match = raw.match(/access_token=([^;]+)/)
      if (match)
        cookie = `access_token=${match[1]}`
    },
  })
  return cookie
}

export async function fetchTugtainer(creds: ServiceCredentials) {
  const { url, password } = creds
  if (!url || !password)
    return null

  const base = url.replace(/\/$/, '')
  const cookie = await login(base, password)

  const summaries = await $fetch<HostSummary[]>(`${base}/api/public/summary`, {
    headers: { Cookie: cookie },
  })

  const enabled = summaries.filter(h => h.host_enabled)
  const fields: { label: string; value: unknown }[] = []

  const multiHost = enabled.length > 1
  for (const host of enabled) {
    const updates = host.by_update_available['true'] ?? 0
    const prefix = multiHost ? `${host.host_name} - ` : ''
    fields.push({ label: `${prefix}Updates available`, value: updates })
  }

  const totalContainers = enabled.reduce((s, h) => s + h.total_containers, 0)
  const unusedImages = enabled.reduce((s, h) => s + h.unused_images, 0)
  const danglingImages = enabled.reduce((s, h) => s + h.dangling_images, 0)

  fields.push({ label: 'Total containers', value: totalContainers })
  fields.push({ label: 'Unused images',    value: unusedImages })
  fields.push({ label: 'Dangling images',  value: danglingImages })

  return { type: 'tugtainer', fields }
}

export { fetchTugtainer as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  return fetchTugtainer(creds)
})
