import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/dockhand'
export const meta = definition

type EnvStats = {
  running: number
  stopped: number
  unhealthy: number
  pendingUpdates: number
  total: number
}

async function login(base: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/dockhand_session=([^;]+)/)
  if (!match)
    throw new Error('Login failed: no session cookie')
  return match[1]!
}

export async function fetchDockhand(creds: ServiceCredentials) {
  const { url, username, password } = creds
  if (!url || !username || !password)
    return null

  const base = url.replace(/\/$/, '')

  const sessionToken = await login(base, username, password)
  const headers = { Cookie: `dockhand_session=${sessionToken}` }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  const response = await fetch(`${base}/api/dashboard/stats/stream`, {
    headers,
    signal: controller.signal,
  })

  if (!response.ok || !response.body) {
    clearTimeout(timeout)
    return null
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const envStats = new Map<number, EnvStats>()
  let buffer = ''
  let finished = false

  try {
    while (!finished) {
      const { value, done } = await reader.read()
      if (done)
        break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        if (line.startsWith('event: done')) {
          finished = true
          break
        }
        if (!line.startsWith('data: '))
          continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '{}')
          continue
        let partial: Record<string, unknown>
        try {
          partial = JSON.parse(jsonStr)
        } catch {
          continue
        }
        const containers = partial.containers as EnvStats | undefined
        const loading = partial.loading as { containers?: boolean } | undefined
        if (containers && loading?.containers === false) {
          envStats.set(partial.id as number, {
            running: containers.running,
            stopped: containers.stopped,
            unhealthy: containers.unhealthy,
            pendingUpdates: containers.pendingUpdates,
            total: containers.total,
          })
        }
      }
    }
  } finally {
    clearTimeout(timeout)
    reader.cancel()
  }

  let running = 0, stopped = 0, unhealthy = 0, pendingUpdates = 0, total = 0
  for (const s of envStats.values()) {
    running += s.running
    stopped += s.stopped
    unhealthy += s.unhealthy
    pendingUpdates += s.pendingUpdates
    total += s.total
  }

  const allFields = [
    { label: 'Running',         value: running },
    { label: 'Stopped',         value: stopped },
    { label: 'Unhealthy',       value: unhealthy },
    { label: 'Pending Updates', value: pendingUpdates },
    { label: 'Total',           value: total },
  ]

  return { type: 'dockhand', fields: getOrderedActiveFields('dockhand', allFields) }
}

export { fetchDockhand as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchDockhand, ['url', 'username', 'password']))
