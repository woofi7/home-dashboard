import { createConnection } from 'node:net'
import { loadConfig } from './config'
import { createCache } from './cache'

type DockerContainer = { Names: string[]; State: string; Status: string }
export type DockerStatus = Record<string, { state: string; status: string }>

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

async function fetchContainers(): Promise<DockerContainer[]> {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  const docker = settings.docker as { host?: string; socketPath?: string } | undefined
  const socketPath = docker?.socketPath ?? '/var/run/docker.sock'
  const host = process.env.DOCKER_HOST ?? docker?.host

  if (host) {
    const url = new URL('/v1.41/containers/json', host.replace(/^tcp:/, 'http:'))
    return $fetch<DockerContainer[]>(url.toString())
  }

  const { existsSync } = await import('node:fs')
  if (existsSync(socketPath)) {
    return httpOverSocket(socketPath, '/v1.41/containers/json') as Promise<DockerContainer[]>
  }

  return []
}

export function fetchDockerStatus(): Promise<DockerStatus> {
  return cache.fetch(async () => {
    const containers = await fetchContainers().catch(() => [] as DockerContainer[])
    const data: DockerStatus = {}
    for (const c of containers) {
      const name = c.Names[0]?.replace(/^\//, '') ?? ''
      if (name)
        data[name] = { state: c.State, status: c.Status }
    }
    return data
  }, TTL)
}
