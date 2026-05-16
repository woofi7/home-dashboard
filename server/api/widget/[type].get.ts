import { getWidgetDef } from '../../utils/widget-registry'
import { buildAuthHeaders, buildAuthQuery } from '../../utils/auth'
import { resolveJsonPath } from '../../utils/jsonpath'
import { getActiveFields } from '../../utils/widget-fields'

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')!
  const query = getQuery(event) as Record<string, string>
  const { url, ...credentials } = query

  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  const def = getWidgetDef(type)
  if (!def) throw createError({ statusCode: 404, message: `Unknown widget type: ${type}` })

  // Handle cookie-login auth: POST to login endpoint, extract session cookie
  let cookieHeader: string | undefined
  if (def.auth.type === 'login') {
    const loginPath = (def.auth as { loginPath?: string }).loginPath ?? '/api/v2/auth/login'
    const usernameField = (def.auth as { usernameField?: string }).usernameField ?? 'username'
    const passwordField = (def.auth as { passwordField?: string }).passwordField ?? 'password'
    const cookieName = (def.auth as { cookieName?: string }).cookieName ?? 'SID'
    const loginUrl = new URL(loginPath, url).toString()
    const body = `${usernameField}=${encodeURIComponent(credentials.username ?? '')}&${passwordField}=${encodeURIComponent(credentials.password ?? '')}`
    try {
      const res = await $fetch.raw(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      const setCookie = res.headers.get('set-cookie') ?? ''
      const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`))
      if (match) cookieHeader = `${cookieName}=${match[1]}`
    } catch {
      // fall through — requests will likely fail but that's fine
    }
  }

  const authHeaders = buildAuthHeaders(def.auth, credentials)
  const authQueryParams = buildAuthQuery(def.auth, credentials)
  if (cookieHeader) authHeaders['Cookie'] = cookieHeader

  const endpointResults: Record<string, unknown> = {}

  await Promise.all(
    Object.entries(def.endpoints).map(async ([key, endpoint]) => {
      const targetUrl = new URL(endpoint.path, url)
      for (const [k, v] of Object.entries(authQueryParams)) {
        targetUrl.searchParams.set(k, v)
      }
      try {
        let data = await $fetch(targetUrl.toString(), {
          method: endpoint.method ?? 'GET',
          headers: { ...authHeaders, ...(endpoint.headers ?? {}) },
          ...(endpoint.body !== undefined ? { body: endpoint.body } : {}),
        }) as unknown
        if (endpoint.responseKey && data && typeof data === 'object' && !Array.isArray(data)) {
          data = (data as Record<string, unknown>)[endpoint.responseKey] ?? data
        }
        endpointResults[key] = data
      } catch {
        endpointResults[key] = null
      }
    })
  )

  const allLabels = def.display.map(d => d.label)
  const active = getActiveFields(type, allLabels)

  const resolved = def.display
    .filter(d => active.has(d.label))
    .map(({ label, value, suffix, format }) => {
      const raw = resolveJsonPath(endpointResults, value)
      if (format === 'bytes' || format === 'bytes/s') {
        const n = Number(raw) || 0
        const unit = format === 'bytes/s' ? '/s' : ''
        if (n >= 1024 ** 3) return { label, value: `${(n / 1024 ** 3).toFixed(2)} GB${unit}` }
        if (n >= 1024 ** 2) return { label, value: `${(n / 1024 ** 2).toFixed(2)} MB${unit}` }
        if (n >= 1024) return { label, value: `${(n / 1024).toFixed(1)} KB${unit}` }
        return { label, value: `${n} B${unit}` }
      }
      return { label, value: raw, suffix }
    })

  return { type, fields: resolved }
})
