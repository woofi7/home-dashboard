import { loadConfig } from '../utils/config'
import { buildAuthHeaders, buildAuthQuery } from '../utils/auth'
import type { AuthConfig } from '../utils/auth'

type ServiceConfig = {
  name: string
  url: string
  auth?: AuthConfig
  [key: string]: unknown
}

type ServiceGroup = {
  name: string
  services: ServiceConfig[]
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as { service: string; path?: string }
  if (!query.service) throw createError({ statusCode: 400, message: 'service is required' })

  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  let service: ServiceConfig | undefined

  for (const group of groups) {
    service = group.services?.find((s) => s.name === query.service)
    if (service) break
  }

  if (!service) throw createError({ statusCode: 404, message: `Service not found: ${query.service}` })

  const targetUrl = new URL(query.path ?? '/', service.url)
  const auth: AuthConfig = (service.auth as AuthConfig) ?? { type: 'none' }
  const authHeaders = buildAuthHeaders(auth, service as Record<string, string>)
  const authQueryParams = buildAuthQuery(auth, service as Record<string, string>)

  for (const [k, v] of Object.entries(authQueryParams)) {
    targetUrl.searchParams.set(k, v)
  }

  const data = await $fetch(targetUrl.toString(), { headers: authHeaders })
  return data
})
