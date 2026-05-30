import {type DockerStatus, fetchDockerStatus} from '../utils/docker'
import {fetchWidgetStatus, type WidgetOutcome} from '../utils/widgetError'
import {loadConfig} from '../utils/config'
import {CRED_FIELDS} from '../utils/credentialMerge'
import {createCache} from '../utils/cache'
import type {PingStatus, ServiceGroup, WidgetStatusMap} from '../types'

type RefreshResponse = {
  docker: DockerStatus
  ping: PingStatus
  widgets: WidgetStatusMap
}

const TTL = 30_000
const WIDGET_TIMEOUT = 8_000

export const refreshCache = createCache<RefreshResponse>()

async function pingUrl(url: string): Promise<boolean> {
  try {
    await $fetch(url, { method: 'GET', timeout: 4000 })
    return true
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    return !!(status && status < 600)
  }
}

function withTimeout(p: Promise<WidgetOutcome>, ms: number): Promise<WidgetOutcome> {
  const timeout = new Promise<WidgetOutcome>(resolve =>
    setTimeout(() => resolve({ error: { kind: 'timeout', message: `Timed out after ${ms / 1000}s` } }), ms),
  )
  return Promise.race([p, timeout])
}

function healthcheckPingUrl(service: ServiceGroup['services'][number]): string | null {
  const hc = service.healthcheck as string | undefined
  if (hc === 'none' || hc === 'docker')
    return null
  if (hc && hc !== 'http')
    return hc
  return (service.url as string | undefined) ?? null
}

async function doRefresh(): Promise<RefreshResponse> {
  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  const services = groups.flatMap(g => g.services)
  const urls = [...new Set(services.map(healthcheckPingUrl).filter((u): u is string => !!u))]
  const widgetServices = services.filter(s => s.type && s.url)

  const [docker, pingEntries, widgetEntries] = await Promise.all([
    fetchDockerStatus(),
    Promise.all(urls.map(async url => [url, await pingUrl(url)] as const)),
    Promise.all(
      widgetServices.map(async s => {
        const passFields = new Set(['url', 'widgetUrl', ...CRED_FIELDS])
        const credentials = Object.fromEntries(
          Object.entries(s).filter(([k, v]) => passFields.has(k) && typeof v === 'string'),
        ) as Record<string, string>
        const effectiveUrl = credentials.widgetUrl?.trim() || credentials.url
        const result = await withTimeout(fetchWidgetStatus(s.type as string, { ...credentials, url: effectiveUrl }), WIDGET_TIMEOUT)
        return [s.name, result] as const
      }),
    ),
  ])

  return {
    docker,
    ping: Object.fromEntries(pingEntries),
    widgets: Object.fromEntries(widgetEntries),
  }
}

export default defineEventHandler((event): Promise<RefreshResponse> => {
  const { force } = getQuery(event) as { force?: string }
  const forceHeader = getHeader(event, 'x-refresh-force')
  return refreshCache.fetch(doRefresh, TTL, !!force || forceHeader === '1')
})
