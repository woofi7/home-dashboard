import type { ServiceCredentials } from '../../utils/auth'
import { getActiveFields } from '../../utils/widget-fields'

export const meta = { name: 'Home Assistant', authType: 'bearer', displayLabels: ['Entities', 'Automations', 'Lights', 'Switches', 'Sensors', 'Climate', 'Media players', 'Scenes'] } as const

export async function fetchHomeAssistant(creds: ServiceCredentials) {
  const { url, apiKey } = creds
  if (!url || !apiKey)
    return null

  const base = url.replace(/\/$/, '')
  const states = await $fetch<Array<{ entity_id: string; state: string }>>(`${base}/api/states`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  const count = (prefix: string) => states.filter(s => s.entity_id.startsWith(`${prefix}.`)).length

  const allFields = [
    { label: 'Entities',     value: states.length },
    { label: 'Automations',  value: count('automation') },
    { label: 'Lights',       value: count('light') },
    { label: 'Switches',     value: count('switch') },
    { label: 'Sensors',      value: count('sensor') },
    { label: 'Climate',      value: count('climate') },
    { label: 'Media players', value: count('media_player') },
    { label: 'Scenes',       value: count('scene') },
  ]

  const active = getActiveFields('homeassistant', allFields.map(f => f.label))
  return { type: 'homeassistant', fields: allFields.filter(f => active.has(f.label)) }
}

export { fetchHomeAssistant as fetch }
export default defineEventHandler(async (event) => {
  const creds = getQuery(event) as ServiceCredentials
  if (!creds.url)
    throw createError({ statusCode: 400, message: 'url is required' })
  if (!creds.apiKey)
    throw createError({ statusCode: 400, message: 'apiKey (long-lived token) is required' })
  return fetchHomeAssistant(creds)
})
