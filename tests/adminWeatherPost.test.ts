import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockClear } = vi.hoisted(() => ({ mockClear: vi.fn() }))

vi.mock('../server/api/weather.get', () => ({
  weatherCache: { clear: mockClear, get: vi.fn(), set: vi.fn() },
}))

const mockLoadConfig = vi.fn()
const mockWriteConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  writeConfig: (...args: unknown[]) => mockWriteConfig(...args),
}))

vi.mock('../server/utils/adminAuth', () => ({
  assertAuth: vi.fn(),
}))

vi.stubGlobal('readBody', vi.fn())

import postHandler from '../server/api/admin/weather.post'

const readBody = vi.mocked(globalThis.readBody as (e: unknown) => Promise<unknown>)

beforeEach(() => {
  mockLoadConfig.mockReset()
  mockWriteConfig.mockReset()
  mockClear.mockReset()
  readBody.mockReset()
  mockLoadConfig.mockReturnValue({})
})

describe('admin/weather.post', () => {
  it('writes weather config to settings.yaml', async () => {
    const body = { locationMode: 'ip', units: 'celsius' }
    readBody.mockResolvedValue(body)
    await (postHandler as Function)(null)
    expect(mockWriteConfig).toHaveBeenCalledWith('settings.yaml', expect.objectContaining({ weather: body }))
  })

  it('clears the weather cache after saving', async () => {
    readBody.mockResolvedValue({ locationMode: 'ip', units: 'celsius' })
    await (postHandler as Function)(null)
    expect(mockClear).toHaveBeenCalled()
  })

  it('merges with existing settings instead of overwriting them', async () => {
    mockLoadConfig.mockReturnValue({ title: 'My Dashboard', adminToken: 'secret' })
    readBody.mockResolvedValue({ locationMode: 'ip', units: 'fahrenheit' })
    await (postHandler as Function)(null)
    const written = mockWriteConfig.mock.calls[0]![1] as Record<string, unknown>
    expect(written.title).toBe('My Dashboard')
    expect(written.adminToken).toBe('secret')
  })

  it('returns { ok: true }', async () => {
    readBody.mockResolvedValue({ locationMode: 'ip', units: 'celsius' })
    const result = await (postHandler as Function)(null)
    expect(result).toEqual({ ok: true })
  })
})
