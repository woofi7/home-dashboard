import { createConnection } from 'node:net'
import { loadConfig } from './config'
import { createCache } from './cache'
import type { DockerContainerStatus, DockerServerStatus, DockerStatus } from '../types'

type DockerContainer = { Names: string[]; State: string; Status: string }
type DockerServerConfig = { socket?: string; host?: string; port?: number }

const cache = createCache<DockerStatus>()
const TTL = 30_000

function httpOverSocket(socketPath: string, path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath)
    let raw = ''
    socket.on('connect', () => socket.write(`GET ${path} HTTP/1.0\r\nHost: localhost\r\n\r\n`))
    socket.on('data', chunk => { raw += chunk.toString() })
    socket.on('end', () => {
      try { resolve(JSON.parse(raw.slice(raw.indexOf('\r\n\r\n') + 4))) }
      catch { reject(new Error('parse error')) }
    })
    socket.on('error', reject)
  })
}

async function fetchContainersForServer(server: DockerServerConfig): Promise<DockerContainer[]> {
  if (server.host) {
    const base = server.host.replace(/^tcp:/, 'http:')
    const origin = server.port ? `${base}:${server.port}` : base
    return $fetch<DockerContainer[]>(`${origin}/v1.41/containers/json`)
  }

  const socketPath = server.socket ?? '/var/run/docker.sock'
  const { existsSync } = await import('node:fs')
  if (existsSync(socketPath))
    return httpOverSocket(socketPath, '/v1.41/containers/json') as Promise<DockerContainer[]>

  return []
}

export function toServerStatus(containers: DockerContainer[]): DockerServerStatus {
  const data: DockerServerStatus = {}
  for (const c of containers) {
    const name = c.Names[0]?.replace(/^\//, '') ?? ''
    if (name)
      data[name] = { state: c.State, status: c.Status } satisfies DockerContainerStatus
  }
  return data
}

export function clearDockerCache() { cache.clear() }

export function fetchDockerStatus(): Promise<DockerStatus> {
  return cache.fetch(async () => {
    const servers = loadConfig<Record<string, DockerServerConfig>>('docker.yaml') ?? {}

    if (Object.keys(servers).length === 0) {
      const host = process.env.DOCKER_HOST
      const fallback: DockerServerConfig = host ? { host } : { socket: '/var/run/docker.sock' }
      const containers = await fetchContainersForServer(fallback).catch(() => [] as DockerContainer[])
      return { local: toServerStatus(containers) }
    }

    const entries = await Promise.all(
      Object.entries(servers).map(async ([name, server]) => {
        const containers = await fetchContainersForServer(server).catch(() => [] as DockerContainer[])
        return [name, toServerStatus(containers)] as const
      }),
    )
    return Object.fromEntries(entries)
  }, TTL)
}
