import { getWidgetDef } from '../../utils/widget-registry'
import { fetchWidgetForService } from '../../utils/widgetDispatch'
import { CRED_FIELDS } from '../../utils/credentialMerge'

const DEDICATED_TYPES = new Set(['unraid', 'portainer', 'duplicati', 'homeassistant', 'pihole', 'qbittorrent', 'audiobookshelf'])
const ALLOWED_CRED_FIELDS = new Set(CRED_FIELDS)

export default defineEventHandler(async (event) => {
  const body = await readBody<{ type: string; url: string; [key: string]: string }>(event)
  const { type, url, ...rawCreds } = body
  const credentials = Object.fromEntries(
    Object.entries(rawCreds).filter(([k]) => ALLOWED_CRED_FIELDS.has(k))
  )

  if (!type || !url) throw createError({ statusCode: 400, message: 'type and url are required' })

  // Dedicated widgets: test by actually running the fetcher
  if (DEDICATED_TYPES.has(type)) {
    try {
      const result = await fetchWidgetForService(type, { url, ...credentials })
      if (result && result.fields.length > 0) return { ok: true, fields: result.fields }
      return { ok: false, message: 'Connected but returned no data — check credentials' }
    } catch (err: unknown) {
      const status = (err as { response?: { response?: { status?: number } } })?.response?.status
      return { ok: false, status }
    }
  }

  // YAML-registry widgets: run the full fetch+display pipeline
  if (!getWidgetDef(type)) throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  try {
    const result = await fetchWidgetForService(type, { url, ...credentials })
    if (result && result.fields.length > 0) return { ok: true, fields: result.fields }
    return { ok: false, message: 'Connected but returned no data — check credentials or widget YAML' }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    return { ok: false, status }
  }
})
