import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/homeassistant'
export const meta = definition


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

  return { type: 'homeassistant', fields: getOrderedActiveFields('homeassistant', allFields) }
}

export { fetchHomeAssistant as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchHomeAssistant, ['url', 'apiKey']))
