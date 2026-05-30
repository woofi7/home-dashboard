import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../app/stores/auth'

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useAuthStore - fetchStatus', () => {
  it('maps the status payload into state', async () => {
    fetchMock.mockResolvedValue({ tokenConfigured: true, editEnabled: true, authenticated: false })
    const store = useAuthStore()
    await store.fetchStatus()
    expect(store.tokenConfigured).toBe(true)
    expect(store.editEnabled).toBe(true)
    expect(store.authenticated).toBe(false)
  })

  it('leaves state untouched when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const store = useAuthStore()
    await store.fetchStatus()
    expect(store.tokenConfigured).toBe(false)
    expect(store.editEnabled).toBe(false)
  })
})

describe('useAuthStore - needsLogin getter', () => {
  it('is true only when edit is enabled and not authenticated', () => {
    const store = useAuthStore()
    store.editEnabled = true
    store.authenticated = false
    expect(store.needsLogin).toBe(true)
    store.authenticated = true
    expect(store.needsLogin).toBe(false)
    store.editEnabled = false
    store.authenticated = false
    expect(store.needsLogin).toBe(false)
  })
})

describe('useAuthStore - login / setup', () => {
  it('login POSTs the password, refetches status, and returns true', async () => {
    fetchMock.mockResolvedValue({ tokenConfigured: true, editEnabled: true, authenticated: true })
    const store = useAuthStore()
    const ok = await store.login('hunter2')
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', { method: 'POST', body: { password: 'hunter2' } })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/status')
    expect(store.authenticated).toBe(true)
  })

  it('login returns false when the request rejects', async () => {
    fetchMock.mockRejectedValue(new Error('bad password'))
    const store = useAuthStore()
    expect(await store.login('wrong')).toBe(false)
  })

  it('setup POSTs to the setup endpoint and returns true', async () => {
    fetchMock.mockResolvedValue({ tokenConfigured: true, editEnabled: true, authenticated: true })
    const store = useAuthStore()
    expect(await store.setup('newtoken')).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/setup', { method: 'POST', body: { password: 'newtoken' } })
  })
})

describe('useAuthStore - logout', () => {
  it('POSTs logout then refetches status', async () => {
    fetchMock.mockResolvedValue({ tokenConfigured: true, editEnabled: true, authenticated: false })
    const store = useAuthStore()
    await store.logout()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/status')
  })
})

describe('useAuthStore - ensureLoaded', () => {
  it('returns a promise that resolves after the first status fetch', async () => {
    fetchMock.mockResolvedValue({ tokenConfigured: true, editEnabled: false, authenticated: false })
    const store = useAuthStore()
    await store.ensureLoaded()
    expect(store.tokenConfigured).toBe(true)
  })
})
