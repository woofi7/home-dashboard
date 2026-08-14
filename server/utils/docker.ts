import { createConnection } from 'node:net'
import { existsSync } from 'node:fs'
import { URL } from 'node:url'
import { loadConfig } from './config'
import { createCache } from './cache'
import type { DockerContainerStatus, DockerServerStatus, DockerStatus } from '../types'

type DockerContainer = { Names: string[]; State: string; Status: string }
type DockerServerConfig = { socket?: string; host?: string; port?: number; label?: string }

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
    const url = new URL(server.host.replace(/^tcp:/, 'http:'))
    if (server.port)
      url.port = String(server.port)
    else if (!url.port)
      url.port = '2375'
    return $fetch<DockerContainer[]>(`${url.origin}/v1.41/containers/json`)
  }

  const socketPath = server.socket ?? '/var/run/docker.sock'
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

function tcpPing(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const timer = setTimeout(() => { socket.destroy(); resolve(false) }, timeoutMs)
    socket.on('connect', () => { clearTimeout(timer); socket.destroy(); resolve(true) })
    socket.on('error', () => { clearTimeout(timer); resolve(false) })
  })
}

export async function pingDockerServer(server: DockerServerConfig): Promise<boolean> {
  if (server.host) {
    try {
      const base = server.host.replace(/^tcp:/, 'http:')
      const parsed = new URL(base)
      const host = parsed.hostname
      const port = server.port ?? (parsed.port ? Number(parsed.port) : 2375)
      return await tcpPing(host, port)
    }
    catch {
      return false
    }
  }

  const socketPath = server.socket ?? '/var/run/docker.sock'
  return existsSync(socketPath)
}

export function fetchDockerStatus(): Promise<DockerStatus> {
  return cache.fetch(async () => {
    const servers = { ...(loadConfig<Record<string, DockerServerConfig>>('docker.yaml') ?? {}) }

    // A label-only "local" entry (renamed, but no connection override) must
    // still fall through to the DOCKER_HOST/socket default below.
    if (!servers.local?.host && !servers.local?.socket) {
      const host = process.env.DOCKER_HOST
      servers.local = { ...servers.local, ...(host ? { host } : { socket: '/var/run/docker.sock' }) }
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
