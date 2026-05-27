import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../server/utils/cache', () => ({
  createCache: () => ({ get: vi.fn(), set: vi.fn((d: unknown) => d), clear: vi.fn(), fetch: vi.fn() }),
}))

const mockLoadConfig = vi.fn()
const mockWriteConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  writeConfig: (...args: unknown[]) => mockWriteConfig(...args),
}))

import { unsplashCache, pexelsCache, pixabayCache } from '../server/api/background.get'
import postHandler from '../server/api/admin/background.post'

const mockEvent = { method: 'POST' }
vi.stubGlobal('readBody', vi.fn(async () => ({ provider: 'unsplash', query: 'mountains' })))

beforeEach(() => {
  mockLoadConfig.mockReturnValue({})
  mockWriteConfig.mockReset()
  vi.mocked(unsplashCache.clear).mockClear()
  vi.mocked(pexelsCache.clear).mockClear()
  vi.mocked(pixabayCache.clear).mockClear()
})

describe('admin/background.post', () => {
  it('writes the new background config to settings.yaml', async () => {
    await (postHandler as Function)(mockEvent)
    expect(mockWriteConfig).toHaveBeenCalledWith('settings.yaml', expect.objectContaining({
      background: expect.objectContaining({ provider: 'unsplash' }),
    }))
  })

  it('clears unsplash cache on save', async () => {
    await (postHandler as Function)(mockEvent)
    expect(unsplashCache.clear).toHaveBeenCalled()
  })

  it('clears pexels cache on save', async () => {
    await (postHandler as Function)(mockEvent)
    expect(pexelsCache.clear).toHaveBeenCalled()
  })

  it('clears pixabay cache on save', async () => {
    await (postHandler as Function)(mockEvent)
    expect(pixabayCache.clear).toHaveBeenCalled()
  })

  it('merges with existing settings rather than replacing them', async () => {
    mockLoadConfig.mockReturnValue({ title: 'My Dashboard', adminToken: 'secret' })
    await (postHandler as Function)(mockEvent)
    expect(mockWriteConfig).toHaveBeenCalledWith('settings.yaml', expect.objectContaining({
      title: 'My Dashboard',
      adminToken: 'secret',
    }))
  })
})
