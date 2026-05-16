import { fetchDockerStatus, type DockerStatus } from '../utils/docker'
import { fetchWidgetForService } from '../utils/widgetDispatch'
import { type WidgetResult } from '../utils/fetchWidget'
import { loadConfig } from '../utils/config'
import type { ServiceGroup } from '../types'

type RefreshResponse = {
  docker: DockerStatus
  ping: Record<string, boolean>
  widgets: Record<string, WidgetResult | null>
}

let cache: { data: RefreshResponse; at: number } | null = null
const TTL = 30_000

async function pingUrl(url: string): Promise<boolean> {
  try {
    await $fetch(url, { method: 'GET', timeout: 4000 })
    return true
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    return !!(status && status < 600)
  }
}

export default defineEventHandler(async (): Promise<RefreshResponse> => {
  if (cache && Date.now() - cache.at < TTL) return cache.data

  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  const services = groups.flatMap(g => g.services)
  const urls = [...new Set(services.map(s => s.url).filter((u): u is string => !!u))]
  const widgetServices = services.filter(s => s.type && s.url)

  const [docker, pingEntries, widgetEntries] = await Promise.all([
    fetchDockerStatus(),
    Promise.all(urls.map(async url => [url, await pingUrl(url)] as const)),
    Promise.all(
      widgetServices.map(async s => {
        const credentials = Object.fromEntries(
          Object.entries(s).filter(([, v]) => typeof v === 'string'),
        ) as Record<string, string>
        const result = await fetchWidgetForService(s.type as string, credentials)
        return [s.name, result] as const
      }),
    ),
  ])

  const data: RefreshResponse = {
    docker,
    ping: Object.fromEntries(pingEntries),
    widgets: Object.fromEntries(widgetEntries),
  }

  cache = { data, at: Date.now() }
  return data
})
