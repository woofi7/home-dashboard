import { fetchWidgetStatus } from '../../utils/widgetError'
import { WIDGETS } from '../../utils/widgetRegistry'
import { CRED_FIELDS } from '../../utils/credentialMerge'

const ALLOWED_CRED_FIELDS = new Set(CRED_FIELDS)

export default defineEventHandler(async (event) => {
  const body = await readBody<{ type: string; url: string; widgetUrl?: string; [key: string]: string }>(event)
  const { type, url, widgetUrl, ...rawCreds } = body

  if (!type || !url)
    throw createError({ statusCode: 400, message: 'type and url are required' })
  if (!(WIDGETS as Record<string, unknown>)[type])
    throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  const credentials = Object.fromEntries(
    Object.entries(rawCreds).filter(([k]) => ALLOWED_CRED_FIELDS.has(k))
  )
  const effectiveUrl = widgetUrl?.trim() || url

  const outcome = await fetchWidgetStatus(type, { url: effectiveUrl, ...credentials })
  if ('error' in outcome)
    return { ok: false, status: outcome.error.status, message: outcome.error.message }
  return { ok: true, fields: outcome.fields }
})
