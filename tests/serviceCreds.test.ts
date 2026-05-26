import { describe, it, expect, vi, beforeEach } from 'vitest'

type ServiceGroup = { name: string; services: Record<string, unknown>[] }

const mockLoadConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const e = new Error(message)
  ;(e as { statusCode?: number }).statusCode = statusCode
  return e
})

import handler from '../server/api/edit/service-creds.post'

const readBody = vi.mocked(globalThis.readBody as (e: unknown) => Promise<unknown>)

const fakeGroups: ServiceGroup[] = [
  {
    name: 'Media',
    services: [
      { name: 'Sonarr', url: 'http://10.0.1.2:8989/', type: 'sonarr', apiKey: 'real-sonarr-key' },
      { name: 'Radarr', url: 'http://10.0.1.2:7878/', type: 'radarr', apiKey: 'real-radarr-key' },
    ],
  },
  {
    name: 'Services',
    services: [
      { name: 'qBittorrent', url: 'http://10.0.1.2:8080/', type: 'qbittorrent', username: 'admin', password: 'secret' },
    ],
  },
]

beforeEach(() => {
  mockLoadConfig.mockReset()
  readBody.mockReset()
  mockLoadConfig.mockReturnValue(fakeGroups)
})

describe('POST /api/edit/service-creds', () => {
  it('returns apiKey for a service found by name', async () => {
    readBody.mockResolvedValue({ name: 'Sonarr' })
    const result = await (handler as Function)(null)
    expect(result).toEqual({ apiKey: 'real-sonarr-key' })
  })

  it('returns username and password for basic auth service', async () => {
    readBody.mockResolvedValue({ name: 'qBittorrent' })
    const result = await (handler as Function)(null)
    expect(result).toEqual({ username: 'admin', password: 'secret' })
  })

  it('finds service by group + name when group is provided', async () => {
    readBody.mockResolvedValue({ name: 'Radarr', group: 'Media' })
    const result = await (handler as Function)(null)
    expect(result).toEqual({ apiKey: 'real-radarr-key' })
  })

  it('falls back to flat search when group does not contain the service', async () => {
    readBody.mockResolvedValue({ name: 'Sonarr', group: 'Services' })
    const result = await (handler as Function)(null)
    expect(result).toEqual({ apiKey: 'real-sonarr-key' })
  })

  it('returns substituted credential values from loadConfig', async () => {
    mockLoadConfig.mockReturnValue([{
      name: 'Media',
      services: [{ name: 'Readarr', apiKey: '6ac75ce5893b463c8bae0ed795d23aef' }],
    }])
    readBody.mockResolvedValue({ name: 'Readarr' })
    const result = await (handler as Function)(null)
    expect((result as Record<string, string>).apiKey).toBe('6ac75ce5893b463c8bae0ed795d23aef')
  })

  it('does NOT return raw ${ENV_VAR} placeholders when env vars are substituted', async () => {
    mockLoadConfig.mockReturnValue([{
      name: 'Media',
      services: [{ name: 'Sonarr', apiKey: '7b4a637a5c934d1a90d768680d0b3ca9' }],
    }])
    readBody.mockResolvedValue({ name: 'Sonarr' })
    const result = await (handler as Function)(null)
    const apiKey = (result as Record<string, string>).apiKey
    expect(apiKey).not.toMatch(/^\$\{/)
    expect(apiKey).toBe('7b4a637a5c934d1a90d768680d0b3ca9')
  })

  it('omits credential fields that are undefined', async () => {
    readBody.mockResolvedValue({ name: 'Sonarr' })
    const result = await (handler as Function)(null)
    expect((result as Record<string, unknown>).username).toBeUndefined()
    expect((result as Record<string, unknown>).password).toBeUndefined()
  })

  it('throws 400 when name is missing', async () => {
    readBody.mockResolvedValue({})
    await expect((handler as Function)(null)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when service is not found', async () => {
    readBody.mockResolvedValue({ name: 'NonExistent' })
    await expect((handler as Function)(null)).rejects.toMatchObject({ statusCode: 404 })
  })
})
