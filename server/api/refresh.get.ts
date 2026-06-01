import {type DockerStatus, fetchDockerStatus} from '../utils/docker'
import {fetchWidgetStatus, type WidgetOutcome} from '../utils/widgetError'
import {loadConfig} from '../utils/config'
import {CRED_FIELDS} from '../utils/credentialMerge'
import {createCache} from '../utils/cache'
import type {PingStatus, ServiceGroup, WidgetStatusMap} from '../types'
import {externalUrl, fetchCandidates} from '#shared/externalUrl'

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

// Reachable on any candidate scheme (https tried before http for scheme-less URLs).
async function pingAny(candidates: string[]): Promise<boolean> {
  for (const url of candidates) {
    if (await pingUrl(url))
      return true
  }
  return false
}

// First candidate that responds, so widgets fetch over the scheme the host actually serves.
async function resolveReachableUrl(candidates: string[]): Promise<string> {
  if (candidates.length === 1)
    return candidates[0]!
  for (const url of candidates) {
    if (await pingUrl(url))
      return url
  }
  return candidates[0]!
}

function withTimeout(p: Promise<WidgetOutcome>, ms: number): Promise<WidgetOutcome> {
  const timeout = new Promise<WidgetOutcome>(resolve =>
    setTimeout(() => resolve({ error: { kind: 'timeout', message: `Timed out after ${ms / 1000}s` } }), ms),
  )
  return Promise.race([p, timeout])
}

function rawPingTarget(service: ServiceGroup['services'][number]): string | null {
  const hc = service.healthcheck as string | undefined
  if (hc === 'none' || hc === 'docker')
    return null
  const raw = hc && hc !== 'http' ? hc : (service.url as string | undefined)
  return raw ?? null
}

async function doRefresh(): Promise<RefreshResponse> {
  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  const services = groups.flatMap(g => g.services)

  // Key pings by the http-normalized URL the client looks them up by, but probe https-first.
  const pingTargets = new Map<string, string[]>()
  for (const raw of services.map(rawPingTarget).filter((u): u is string => !!u)) {
    const key = externalUrl(raw)
    if (!pingTargets.has(key))
      pingTargets.set(key, fetchCandidates(raw))
  }
  const widgetServices = services.filter(s => s.type && s.url)

  const [docker, pingEntries, widgetEntries] = await Promise.all([
    fetchDockerStatus(),
    Promise.all([...pingTargets].map(async ([key, candidates]) => [key, await pingAny(candidates)] as const)),
    Promise.all(
      widgetServices.map(async s => {
        const passFields = new Set(['url', 'widgetUrl', ...CRED_FIELDS])
        const credentials = Object.fromEntries(
          Object.entries(s).filter(([k, v]) => passFields.has(k) && typeof v === 'string'),
        ) as Record<string, string>
        const effectiveUrl = await resolveReachableUrl(fetchCandidates(credentials.widgetUrl?.trim() || credentials.url))
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
