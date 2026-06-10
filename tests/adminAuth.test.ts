import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac, createHash } from 'node:crypto'

// Pin the signing key so the test can craft cookies deterministically and so
// getSessionKey never touches the filesystem / getConfigDir.
const SESSION_KEY = 'test-session-key'
process.env.SESSION_KEY = SESSION_KEY

const { mockLoad } = vi.hoisted(() => ({ mockLoad: vi.fn() }))
vi.mock('../server/utils/config', () => ({ loadConfig: mockLoad, getConfigDir: vi.fn(() => '/tmp') }))

let cookieValue: string | undefined
const setCookieSpy = vi.fn()
vi.stubGlobal('getCookie', vi.fn(() => cookieValue))
vi.stubGlobal('setCookie', setCookieSpy)
vi.stubGlobal('deleteCookie', vi.fn())

import { getAdminToken, tokenConfigured, editEnabled, isAuthenticated, assertAuth, setAuthCookie } from '../server/utils/adminAuth'

const sign = (payload: string) => createHmac('sha256', SESSION_KEY).update(payload).digest('hex')
// Mirror the server's cookie format: "<issuedAt>.<hmac(adminToken|issuedAt)>"
const sessionFor = (token: string, issuedAt = Date.now()) => `${issuedAt}.${sign(`${token}|${issuedAt}`)}`
const event = {} as never

beforeEach(() => {
  mockLoad.mockReset()
  setCookieSpy.mockReset()
  cookieValue = undefined
  delete process.env.ADMIN_TOKEN
})

afterEach(() => {
  delete process.env.ADMIN_TOKEN
})

describe('getAdminToken', () => {
  it('prefers the ADMIN_TOKEN env var over settings', () => {
    process.env.ADMIN_TOKEN = 'from-env'
    mockLoad.mockReturnValue({ adminToken: 'from-settings' })
    expect(getAdminToken()).toBe('from-env')
  })

  it('falls back to settings.adminToken', () => {
    mockLoad.mockReturnValue({ adminToken: 'from-settings' })
    expect(getAdminToken()).toBe('from-settings')
  })

  it('returns empty string when neither is set', () => {
    mockLoad.mockReturnValue({})
    expect(getAdminToken()).toBe('')
  })
})

describe('tokenConfigured / editEnabled', () => {
  it('are true when a token exists', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    expect(tokenConfigured()).toBe(true)
    expect(editEnabled()).toBe(true)
  })

  it('are false when no token exists', () => {
    mockLoad.mockReturnValue({})
    expect(tokenConfigured()).toBe(false)
    expect(editEnabled()).toBe(false)
  })
})

describe('isAuthenticated', () => {
  it('is false when no token is configured, regardless of cookie', () => {
    mockLoad.mockReturnValue({})
    cookieValue = 'anything'
    expect(isAuthenticated(event)).toBe(false)
  })

  it('accepts a freshly minted, correctly signed session', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = sessionFor('secret')
    expect(isAuthenticated(event)).toBe(true)
  })

  it('rejects a tampered signature', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    const good = sessionFor('secret')
    cookieValue = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0')
    expect(isAuthenticated(event)).toBe(false)
  })

  it('rejects a session signed for a different admin token', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = sessionFor('other')
    expect(isAuthenticated(event)).toBe(false)
  })

  it('rejects an expired session (older than the TTL)', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    const longAgo = Date.now() - 1000 * 60 * 60 * 24 * 31 // 31 days
    cookieValue = sessionFor('secret', longAgo)
    expect(isAuthenticated(event)).toBe(false)
  })

  it('rejects a future-dated session', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = sessionFor('secret', Date.now() + 1000 * 60 * 60)
    expect(isAuthenticated(event)).toBe(false)
  })

  it('rejects a malformed cookie', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = 'not-a-session'
    expect(isAuthenticated(event)).toBe(false)
  })

  it('rejects the legacy sha256(token + ":hm_session") cookie value', () => {
    // The old, insecure scheme was derivable from the admin token alone.
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = createHash('sha256').update('secret:hm_session').digest('hex')
    expect(isAuthenticated(event)).toBe(false)
  })
})

describe('setAuthCookie', () => {
  it('sets an httpOnly, strict-sameSite session cookie that authenticates', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    setAuthCookie(event)
    expect(setCookieSpy).toHaveBeenCalledTimes(1)
    const [, name, value, opts] = setCookieSpy.mock.calls[0]
    expect(name).toBe('hm_auth')
    expect(opts).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/' })
    // Over plain HTTP (no getRequestProtocol), the cookie must not be Secure,
    // otherwise LAN deployments could never log in.
    expect(opts.secure).toBe(false)
    // The value it issued is accepted by isAuthenticated.
    cookieValue = value
    expect(isAuthenticated(event)).toBe(true)
  })
})

describe('assertAuth', () => {
  it('throws 401 when not authenticated', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = 'nope'
    expect(() => assertAuth(event)).toThrow('401')
  })

  it('does not throw when authenticated', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = sessionFor('secret')
    expect(() => assertAuth(event)).not.toThrow()
  })
})
