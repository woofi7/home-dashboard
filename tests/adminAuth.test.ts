import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'

const { mockLoad } = vi.hoisted(() => ({ mockLoad: vi.fn() }))
vi.mock('../server/utils/config', () => ({ loadConfig: mockLoad }))

let cookieValue: string | undefined
vi.stubGlobal('getCookie', vi.fn(() => cookieValue))
vi.stubGlobal('setCookie', vi.fn())
vi.stubGlobal('deleteCookie', vi.fn())

import { getAdminToken, tokenConfigured, editEnabled, isAuthenticated, assertAuth } from '../server/utils/adminAuth'

const sessionFor = (token: string) => createHash('sha256').update(token + ':hm_session').digest('hex')
const event = {} as never

beforeEach(() => {
  mockLoad.mockReset()
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

  it('is true when the cookie matches the derived session token', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = sessionFor('secret')
    expect(isAuthenticated(event)).toBe(true)
  })

  it('is false when the cookie does not match', () => {
    mockLoad.mockReturnValue({ adminToken: 'secret' })
    cookieValue = sessionFor('other')
    expect(isAuthenticated(event)).toBe(false)
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
