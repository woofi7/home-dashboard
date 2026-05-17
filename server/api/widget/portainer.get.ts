import type { ServiceCredentials } from '../../utils/auth'
import { getActiveFields } from '../../utils/widget-fields'

export const meta = { name: 'Portainer', authType: 'bearer', displayLabels: ['Running', 'Stopped', 'Containers', 'Stacks', 'Volumes', 'Images'] } as const

export async function fetchPortainer(creds: ServiceCredentials) {
  const { url, apiKey, endpointId } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const headers = { 'X-API-Key': apiKey }

  let epId = endpointId
  if (!epId) {
    const endpoints = await $fetch<Array<{ Id: number; Type: number }>>(`${base}/api/endpoints`, { headers })
    const ep = endpoints.find(e => e.Type !== 1) ?? endpoints[0]
    epId = String(ep.Id)
  }

  const [containers, stacks, volumesRes, images] = await Promise.all([
    $fetch<Array<{ State: string }>>(`${base}/api/endpoints/${epId}/docker/containers/json?all=1`, { headers }),
    $fetch<Array<unknown>>(`${base}/api/stacks?endpointId=${epId}`, { headers }),
    $fetch<{ Volumes: unknown[] }>(`${base}/api/endpoints/${epId}/docker/volumes`, { headers }),
    $fetch<Array<unknown>>(`${base}/api/endpoints/${epId}/docker/images/json`, { headers }),
  ])

  const allFields = [
    { label: 'Running',    value: containers.filter(c => c.State === 'running').length },
    { label: 'Stopped',    value: containers.filter(c => c.State === 'exited' || c.State === 'stopped').length },
    { label: 'Containers', value: containers.length },
    { label: 'Stacks',     value: stacks.length },
    { label: 'Volumes',    value: (volumesRes.Volumes ?? []).length },
    { label: 'Images',     value: images.length },
  ]

  const active = getActiveFields('portainer', allFields.map(f => f.label))
  return { type: 'portainer', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchPortainer as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey is required' })
  return fetchPortainer(creds)
})
