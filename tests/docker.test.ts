import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../server/utils/config', () => ({
  loadConfig: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}))

import { loadConfig } from '../server/utils/config'
import { existsSync } from 'node:fs'
import { toServerStatus, fetchDockerStatus, clearDockerCache } from '../server/utils/docker'

const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
  mockExistsSync.mockReturnValue(false)
  vi.stubGlobal('$fetch', vi.fn())
  clearDockerCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

// ─── toServerStatus ───────────────────────────────────────────────────────────

describe('toServerStatus', () => {
  it('maps container names to state/status', () => {
    const result = toServerStatus([
      { Names: ['/sonarr'], State: 'running', Status: 'Up 2 days' },
      { Names: ['/radarr'], State: 'exited', Status: 'Exited (0) 1 hour ago' },
    ])
    expect(result).toEqual({
      sonarr: { state: 'running', status: 'Up 2 days' },
      radarr: { state: 'exited', status: 'Exited (0) 1 hour ago' },
    })
  })

  it('strips leading slash from container names', () => {
    const result = toServerStatus([{ Names: ['/my-app'], State: 'running', Status: 'Up 1 day' }])
    expect(result['my-app']).toBeDefined()
    expect(result['/my-app']).toBeUndefined()
  })

  it('skips containers with empty names', () => {
    const result = toServerStatus([
      { Names: [''], State: 'running', Status: 'Up' },
      { Names: ['/valid'], State: 'running', Status: 'Up' },
    ])
    expect(Object.keys(result)).toEqual(['valid'])
  })

  it('uses first name when container has multiple names', () => {
    const result = toServerStatus([
      { Names: ['/primary', '/alias'], State: 'running', Status: 'Up' },
    ])
    expect(result['primary']).toBeDefined()
    expect(result['alias']).toBeUndefined()
  })

  it('returns empty object for empty input', () => {
    expect(toServerStatus([])).toEqual({})
  })
})

// ─── fetchDockerStatus ────────────────────────────────────────────────────────

describe('fetchDockerStatus', () => {
  it('uses DOCKER_HOST env when docker.yaml is empty', async () => {
    mockLoadConfig.mockReturnValue({})
    vi.stubEnv('DOCKER_HOST', 'http://10.0.1.2:2375')
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue([
      { Names: ['/plex'], State: 'running', Status: 'Up 3 days' },
    ])

    const result = await fetchDockerStatus()

    expect(result).toEqual({
      local: { plex: { state: 'running', status: 'Up 3 days' } },
    })
    expect(globalThis.$fetch).toHaveBeenCalledWith('http://10.0.1.2:2375/v1.41/containers/json')
  })

  it('returns empty local when docker.yaml is empty and no socket/env', async () => {
    mockLoadConfig.mockReturnValue({})
    vi.stubEnv('DOCKER_HOST', '')
    mockExistsSync.mockReturnValue(false)

    const result = await fetchDockerStatus()

    expect(result).toEqual({ local: {} })
  })

  it('builds correct URL from host + port', async () => {
    mockLoadConfig.mockReturnValue({
      nas: { host: 'http://10.0.1.2', port: 2375 },
    })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await fetchDockerStatus()

    expect(globalThis.$fetch).toHaveBeenCalledWith('http://10.0.1.2:2375/v1.41/containers/json')
  })

  it('builds correct URL from host without explicit port', async () => {
    mockLoadConfig.mockReturnValue({
      remote: { host: 'http://192.168.1.50:2375' },
    })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await fetchDockerStatus()

    expect(globalThis.$fetch).toHaveBeenCalledWith('http://192.168.1.50:2375/v1.41/containers/json')
  })

  it('replaces tcp: scheme with http: in host URL', async () => {
    mockLoadConfig.mockReturnValue({
      nas: { host: 'tcp://10.0.1.2', port: 2375 },
    })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await fetchDockerStatus()

    expect(globalThis.$fetch).toHaveBeenCalledWith('http://10.0.1.2:2375/v1.41/containers/json')
  })

  it('fetches all servers in parallel and keys results by server name', async () => {
    mockLoadConfig.mockReturnValue({
      nas: { host: 'http://10.0.1.2', port: 2375 },
      vps: { host: 'http://100.0.0.1', port: 2375 },
    })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ Names: ['/sonarr'], State: 'running', Status: 'Up' }])
      .mockResolvedValueOnce([{ Names: ['/nginx'], State: 'running', Status: 'Up 1 day' }])

    const result = await fetchDockerStatus()

    expect(Object.keys(result)).toEqual(expect.arrayContaining(['nas', 'vps']))
    expect(result.nas).toHaveProperty('sonarr')
    expect(result.vps).toHaveProperty('nginx')
  })

  it('returns empty containers for a failed server, others succeed', async () => {
    mockLoadConfig.mockReturnValue({
      nas: { host: 'http://10.0.1.2', port: 2375 },
      bad: { host: 'http://10.0.0.0', port: 2375 },
    })
    ;(globalThis.$fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ Names: ['/sonarr'], State: 'running', Status: 'Up' }])
      .mockRejectedValueOnce(new Error('connection refused'))

    const result = await fetchDockerStatus()

    expect(result.nas).toHaveProperty('sonarr')
    expect(result.bad).toEqual({})
  })

  it('skips socket path when file does not exist', async () => {
    mockLoadConfig.mockReturnValue({
      local: { socket: '/run/docker.sock' },
    })
    mockExistsSync.mockReturnValue(false)

    const result = await fetchDockerStatus()

    expect(result.local).toEqual({})
    expect(globalThis.$fetch).not.toHaveBeenCalled()
  })
})
