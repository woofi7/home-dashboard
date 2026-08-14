import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../server/utils/config', () => ({
  loadConfig: vi.fn(),
}))

vi.mock('../server/utils/docker', () => ({
  pingDockerServer: vi.fn(),
}))

import { loadConfig } from '../server/utils/config'
import { pingDockerServer } from '../server/utils/docker'
import handler from '../server/api/admin/docker-ping.get.ts'

const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>
const mockPing = pingDockerServer as ReturnType<typeof vi.fn>

function run() {
  return (handler as unknown as (event: unknown) => Promise<unknown>)({})
}

beforeEach(() => {
  vi.resetAllMocks()
  mockPing.mockResolvedValue(true)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/admin/docker-ping', () => {
  it('pings local via DOCKER_HOST when docker.yaml has no local entry', async () => {
    mockLoadConfig.mockReturnValue({})
    vi.stubEnv('DOCKER_HOST', 'http://10.0.1.2:2375')

    await run()

    expect(mockPing).toHaveBeenCalledWith(expect.objectContaining({ host: 'http://10.0.1.2:2375' }))
  })

  it('still falls back to DOCKER_HOST when local has only a label (renamed, no override)', async () => {
    mockLoadConfig.mockReturnValue({ local: { label: 'My NAS' } })
    vi.stubEnv('DOCKER_HOST', 'http://10.0.1.2:2375')

    await run()

    expect(mockPing).toHaveBeenCalledWith(expect.objectContaining({ host: 'http://10.0.1.2:2375' }))
  })

  it('respects an explicit local connection override', async () => {
    mockLoadConfig.mockReturnValue({ local: { host: 'http://10.0.1.200:2375' } })

    await run()

    expect(mockPing).toHaveBeenCalledWith(expect.objectContaining({ host: 'http://10.0.1.200:2375' }))
  })

  it('pings every configured remote server plus local', async () => {
    mockLoadConfig.mockReturnValue({
      nas: { host: 'http://10.0.1.2', port: 2375 },
      vps: { host: 'http://100.0.0.1', port: 2375 },
    })

    const result = await run() as Record<string, boolean>

    expect(Object.keys(result)).toEqual(expect.arrayContaining(['local', 'nas', 'vps']))
    expect(mockPing).toHaveBeenCalledTimes(3)
  })
})
