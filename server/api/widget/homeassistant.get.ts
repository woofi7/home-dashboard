import { getActiveFields } from '../../utils/widget-fields'

export default defineEventHandler(async (event) => {
  const { url, apiKey } = getQuery(event) as Record<string, string>
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })
  if (!apiKey) throw createError({ statusCode: 400, message: 'apiKey (long-lived token) is required' })

  const base = url.replace(/\/$/, '')
  const headers = { Authorization: `Bearer ${apiKey}` }

  const states = await $fetch<Array<{ entity_id: string; state: string }>>(`${base}/api/states`, { headers })

  function count(prefix: string) {
    return states.filter(s => s.entity_id.startsWith(`${prefix}.`)).length
  }

  const allFields = [
    { label: 'Entities', value: states.length },
    { label: 'Automations', value: count('automation') },
    { label: 'Lights', value: count('light') },
    { label: 'Switches', value: count('switch') },
    { label: 'Sensors', value: count('sensor') },
    { label: 'Climate', value: count('climate') },
    { label: 'Media players', value: count('media_player') },
    { label: 'Scenes', value: count('scene') },
  ]

  const active = getActiveFields('homeassistant', allFields.map(f => f.label))
  return { type: 'homeassistant', fields: allFields.filter(f => active.has(f.label)) }
})
