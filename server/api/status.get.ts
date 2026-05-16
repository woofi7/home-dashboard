import { fetchDockerStatus, type DockerStatus } from '../utils/docker'
import { loadConfig } from '../utils/config'
import type { ServiceGroup } from '../types'

type StatusResponse = {
  docker: DockerStatus
  ping: Record<string, boolean>
}

let cache: { data: StatusResponse; at: number } | null = null
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

export default defineEventHandler(async (): Promise<StatusResponse> => {
  if (cache && Date.now() - cache.at < TTL) return cache.data

  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  const urls = [...new Set(
    groups.flatMap(g => g.services.map(s => s.url).filter((u): u is string => !!u)),
  )]

  const [docker, pingEntries] = await Promise.all([
    fetchDockerStatus(),
    Promise.all(urls.map(async url => [url, await pingUrl(url)] as const)),
  ])

  const data: StatusResponse = {
    docker,
    ping: Object.fromEntries(pingEntries),
  }

  cache = { data, at: Date.now() }
  return data
})
