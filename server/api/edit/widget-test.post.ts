import { fetchWidgetForService } from '../../utils/widgetDispatch'
import { WIDGETS } from '../../utils/widgetRegistry'
import { CRED_FIELDS } from '../../utils/credentialMerge'

const ALLOWED_CRED_FIELDS = new Set(CRED_FIELDS)

export default defineEventHandler(async (event) => {
  const body = await readBody<{ type: string; url: string; [key: string]: string }>(event)
  const { type, url, ...rawCreds } = body

  if (!type || !url)
    throw createError({ statusCode: 400, message: 'type and url are required' })
  if (!(WIDGETS as Record<string, unknown>)[type])
    throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  const credentials = Object.fromEntries(
    Object.entries(rawCreds).filter(([k]) => ALLOWED_CRED_FIELDS.has(k))
  )

  try {
    const result = await fetchWidgetForService(type, { url, ...credentials })
    if (result && result.fields.length > 0)
      return { ok: true, fields: result.fields }
    return { ok: false, message: 'Connected but returned no data — check credentials' }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    return { ok: false, status }
  }
})
