import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSendError = vi.fn()
const mockGetRequestHeader = vi.fn()
const mockUseRuntimeConfig = vi.fn()

vi.stubGlobal('sendError', mockSendError)
vi.stubGlobal('getRequestHeader', mockGetRequestHeader)
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig)

import handler from '../../server/middleware/allowlist'

const event = {}

function setHost(host: string) {
  mockGetRequestHeader.mockImplementation((_event: unknown, header: string) =>
    header === 'host' ? host : undefined
  )
}

function setAllowedHosts(envValue: string | undefined, runtimeValue = '*') {
  if (envValue !== undefined) {
    process.env.ALLOWED_HOSTS = envValue
  } else {
    delete process.env.ALLOWED_HOSTS
  }
  mockUseRuntimeConfig.mockReturnValue({ allowedHosts: runtimeValue })
}

beforeEach(() => {
  mockSendError.mockReset()
  mockGetRequestHeader.mockReset()
  mockUseRuntimeConfig.mockReturnValue({ allowedHosts: '*' })
  delete process.env.ALLOWED_HOSTS
})

afterEach(() => {
  delete process.env.ALLOWED_HOSTS
})

describe('allowlist middleware', () => {
  describe('when ALLOWED_HOSTS is wildcard', () => {
    it('allows any host when env is not set and runtime is *', async () => {
      setHost('anything.example.com')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })

    it('allows any host when env is explicitly *', async () => {
      setAllowedHosts('*')
      setHost('anything.example.com')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })
  })

  describe('when ALLOWED_HOSTS is set via env', () => {
    it('allows a matching host', async () => {
      setAllowedHosts('dash.woofi7.com')
      setHost('dash.woofi7.com')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })

    it('blocks a non-matching host with 403', async () => {
      setAllowedHosts('dash.woofi7.com')
      setHost('localhost')
      await (handler as Function)(event)
      expect(mockSendError).toHaveBeenCalledWith(
        event,
        expect.objectContaining({ message: expect.stringContaining('403') }),
        false
      )
    })

    it('strips port from host header before comparing', async () => {
      setAllowedHosts('dash.woofi7.com')
      setHost('dash.woofi7.com:443')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })

    it('blocks host with wrong port stripped', async () => {
      setAllowedHosts('dash.woofi7.com')
      setHost('localhost:3000')
      await (handler as Function)(event)
      expect(mockSendError).toHaveBeenCalled()
    })

    it('allows any host in a comma-separated list', async () => {
      setAllowedHosts('dash.woofi7.com,home.local')
      setHost('home.local')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })

    it('trims spaces in comma-separated list', async () => {
      setAllowedHosts('dash.woofi7.com , home.local')
      setHost('home.local')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })

    it('blocks a host not in the comma-separated list', async () => {
      setAllowedHosts('dash.woofi7.com,home.local')
      setHost('evil.com')
      await (handler as Function)(event)
      expect(mockSendError).toHaveBeenCalled()
    })
  })

  describe('when ALLOWED_HOSTS is set via runtime config', () => {
    it('falls back to runtime config when env is not set', async () => {
      setAllowedHosts(undefined, 'dash.woofi7.com')
      setHost('localhost')
      await (handler as Function)(event)
      expect(mockSendError).toHaveBeenCalled()
    })

    it('allows matching host from runtime config', async () => {
      setAllowedHosts(undefined, 'dash.woofi7.com')
      setHost('dash.woofi7.com')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })

    it('env takes precedence over runtime config', async () => {
      setAllowedHosts('dash.woofi7.com', 'other.com')
      setHost('dash.woofi7.com')
      await (handler as Function)(event)
      expect(mockSendError).not.toHaveBeenCalled()
    })
  })
})
