import { getWidgetDef } from '../../utils/widget-registry'
import { buildAuthHeaders, buildAuthQuery } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ type: string; url: string; [key: string]: string }>(event)
  const { type, url, ...credentials } = body

  if (!type || !url) throw createError({ statusCode: 400, message: 'type and url are required' })

  const def = getWidgetDef(type)
  if (!def) throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  const firstEndpoint = Object.values(def.endpoints)[0]
  if (!firstEndpoint) return { ok: false, message: 'No endpoints defined' }

  const authHeaders = buildAuthHeaders(def.auth, credentials)
  const authQueryParams = buildAuthQuery(def.auth, credentials)

  const targetUrl = new URL(firstEndpoint.path, url)
  for (const [k, v] of Object.entries(authQueryParams)) {
    targetUrl.searchParams.set(k, v)
  }

  try {
    await $fetch(targetUrl.toString(), {
      method: firstEndpoint.method ?? 'GET',
      headers: authHeaders,
    })
    return { ok: true, url: targetUrl.toString() }
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    return { ok: false, status, url: targetUrl.toString() }
  }
})
