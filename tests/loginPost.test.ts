import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../server/utils/adminAuth', () => ({
  getAdminToken: vi.fn(() => 'correct-token'),
  tokenConfigured: vi.fn(() => true),
  setAuthCookie: vi.fn(),
}))

vi.stubGlobal('getRequestIP', vi.fn(() => '203.0.113.7'))
vi.stubGlobal('setResponseHeader', vi.fn())
const readBody = vi.fn()
vi.stubGlobal('readBody', readBody)

import handler from '../server/api/auth/login.post'
import { setAuthCookie } from '../server/utils/adminAuth'
import { _resetRateLimit } from '../server/utils/loginRateLimit'

const run = () => (handler as (e: unknown) => Promise<unknown>)({})

beforeEach(() => {
  _resetRateLimit()
  readBody.mockReset()
  vi.mocked(setAuthCookie).mockReset()
})

describe('POST /api/auth/login', () => {
  it('sets the auth cookie on the correct password', async () => {
    readBody.mockResolvedValue({ password: 'correct-token' })
    const res = await run()
    expect(res).toEqual({ ok: true })
    expect(setAuthCookie).toHaveBeenCalled()
  })

  it('rejects a wrong password with 401', async () => {
    readBody.mockResolvedValue({ password: 'nope' })
    await expect(run()).rejects.toThrow('401')
    expect(setAuthCookie).not.toHaveBeenCalled()
  })

  it('locks out with 429 after repeated failures from the same IP', async () => {
    readBody.mockResolvedValue({ password: 'nope' })
    for (let i = 0; i < 6; i++)
      await run().catch(() => {})
    await expect(run()).rejects.toThrow('429')
  })
})
