import { getWidgetDef } from './widget-registry'
import { buildAuthHeaders, buildAuthQuery } from './auth'
import { resolveJsonPath } from './jsonpath'
import { getActiveFields } from './widget-fields'
import { formatBytes } from './formatBytes'

export type WidgetField = { label: string; value: unknown; suffix?: string }
export type WidgetResult = { fields: WidgetField[] }

export async function fetchWidget(
  type: string,
  credentials: Record<string, string>,
): Promise<WidgetResult | null> {
  const { url } = credentials
  if (!url) return null

  const def = getWidgetDef(type)
  if (!def) return null

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
    } catch { /* fall through */ }
  }

  const authHeaders = buildAuthHeaders(def.auth, credentials)
  const authQueryParams = buildAuthQuery(def.auth, credentials)
  if (cookieHeader) authHeaders['Cookie'] = cookieHeader

  const endpointResults: Record<string, unknown> = {}

  await Promise.all(
    Object.entries(def.endpoints).map(async ([key, endpoint]) => {
      const targetUrl = new URL(endpoint.path, url)
      for (const [k, v] of Object.entries(authQueryParams)) targetUrl.searchParams.set(k, v)
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
    }),
  )

  const allLabels = def.display.map(d => d.label)
  const active = getActiveFields(type, allLabels)

  const fields = def.display
    .filter(d => active.has(d.label))
    .map(({ label, value, suffix, format }) => {
      const raw = resolveJsonPath(endpointResults, value)
      if (format === 'bytes' || format === 'bytes/s') {
        return { label, value: formatBytes(Number(raw) || 0, format === 'bytes/s') }
      }
      return { label, value: raw, suffix }
    })

  return { fields }
}
