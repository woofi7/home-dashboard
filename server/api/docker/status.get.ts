import { createConnection } from 'node:net'
import { readFileSync, existsSync } from 'node:fs'
import { load as parseYaml } from 'js-yaml'

type DockerContainer = { Names: string[]; State: string; Status: string }
type DockerStatus = Record<string, { state: string; status: string }>

let cache: { data: DockerStatus; at: number } | null = null
const TTL = 30_000

function httpOverSocket(socketPath: string, path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath)
    let raw = ''
    socket.on('connect', () => {
      socket.write(`GET ${path} HTTP/1.0\r\nHost: localhost\r\n\r\n`)
    })
    socket.on('data', (chunk) => { raw += chunk.toString() })
    socket.on('end', () => {
      try {
        const body = raw.slice(raw.indexOf('\r\n\r\n') + 4)
        resolve(JSON.parse(body))
      } catch { reject(new Error('parse error')) }
    })
    socket.on('error', reject)
  })
}

async function fetchContainers(): Promise<DockerContainer[]> {
  const configDir = process.env.CONFIG_DIR || './config'
  let settings: Record<string, unknown> = {}
  const settingsPath = `${configDir}/settings.yaml`
  if (existsSync(settingsPath)) {
    settings = (parseYaml(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>) ?? {}
  }

  const dockerSettings = settings.docker as { host?: string; socketPath?: string } | undefined
  const socketPath = dockerSettings?.socketPath ?? '/var/run/docker.sock'
  const host = process.env.DOCKER_HOST ?? dockerSettings?.host

  if (host) {
    const url = new URL('/v1.41/containers/json', host.replace(/^tcp:/, 'http:'))
    return await $fetch<DockerContainer[]>(url.toString())
  }

  if (existsSync(socketPath)) {
    return await httpOverSocket(socketPath, '/v1.41/containers/json') as DockerContainer[]
  }

  return []
}

export default defineEventHandler(async (): Promise<DockerStatus> => {
  if (cache && Date.now() - cache.at < TTL) return cache.data

  const containers = await fetchContainers().catch(() => [] as DockerContainer[])
  const data: DockerStatus = {}
  for (const c of containers) {
    const name = c.Names[0]?.replace(/^\//, '') ?? ''
    if (name) data[name] = { state: c.State, status: c.Status }
  }
  cache = { data, at: Date.now() }
  return data
})
