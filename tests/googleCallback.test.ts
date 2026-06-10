import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#server/utils/config', () => ({ loadConfig: vi.fn(), writeConfig: vi.fn() }))
vi.mock('#server/utils/googleToken', () => ({ clearGoogleToken: vi.fn() }))

vi.stubGlobal('getQuery', vi.fn())
vi.stubGlobal('getCookie', vi.fn())
vi.stubGlobal('deleteCookie', vi.fn())
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('getRequestURL', vi.fn(() => new URL('https://dash.example/api/auth/google/callback')))
vi.stubGlobal('sendRedirect', vi.fn((_e: unknown, url: string) => url))

import { loadConfig, writeConfig } from '#server/utils/config'
import handler from '#server/api/auth/google/callback.get'

const run = () => (handler as (e: unknown) => Promise<unknown>)({})

beforeEach(() => {
  vi.mocked(getQuery as ReturnType<typeof vi.fn>).mockReset()
  vi.mocked(getCookie as ReturnType<typeof vi.fn>).mockReset()
  vi.mocked(deleteCookie as ReturnType<typeof vi.fn>).mockReset()
  mockFetch.mockReset()
  vi.mocked(loadConfig).mockReset()
  vi.mocked(writeConfig).mockReset()
})

describe('GET /api/auth/google/callback — CSRF state', () => {
  it('rejects when the state cookie is missing', async () => {
    vi.mocked(getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ code: 'c', state: 'abc' })
    vi.mocked(getCookie as ReturnType<typeof vi.fn>).mockReturnValue(undefined)
    await expect(run()).rejects.toThrow('Invalid OAuth state')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects when state does not match the cookie', async () => {
    vi.mocked(getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ code: 'c', state: 'abc' })
    vi.mocked(getCookie as ReturnType<typeof vi.fn>).mockReturnValue('different')
    await expect(run()).rejects.toThrow('Invalid OAuth state')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects when the code is missing', async () => {
    vi.mocked(getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ state: 'abc' })
    await expect(run()).rejects.toThrow('Missing code')
  })

  it('exchanges the code and stores the refresh token when state matches', async () => {
    vi.mocked(getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ code: 'c', state: 'abc' })
    vi.mocked(getCookie as ReturnType<typeof vi.fn>).mockReturnValue('abc')
    vi.mocked(loadConfig).mockReturnValue({ google: { clientId: 'id', clientSecret: 'sec' } } as never)
    mockFetch.mockResolvedValue({ refresh_token: 'rt' })
    await run()
    expect(writeConfig).toHaveBeenCalledWith(
      'settings.yaml',
      expect.objectContaining({ google: expect.objectContaining({ refreshToken: 'rt' }) }),
    )
    // The single-use state cookie is always cleared.
    expect(deleteCookie as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(expect.anything(), 'hm_oauth_state', { path: '/' })
  })
})
