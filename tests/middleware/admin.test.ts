import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const editEnabled = ref(true)
const needsLogin = ref(false)

const mockUseAuth = vi.fn(() => ({
  editEnabled,
  needsLogin,
  ready: Promise.resolve(),
}))
vi.stubGlobal('useAuth', mockUseAuth)

const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

import handler from '~/middleware/admin'

beforeEach(() => {
  vi.stubGlobal('navigateTo', vi.fn())
  editEnabled.value = true
  needsLogin.value = false
  mockUseAuth.mockClear()
  // Healthcheck succeeds by default => online
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ status: 'ok' })
})

describe('admin middleware', () => {
  it('allows access when online, authenticated and edit enabled', async () => {
    await (handler as Function)()
    expect((globalThis as any).navigateTo).not.toHaveBeenCalled()
  })

  it('redirects to / when edit is not enabled', async () => {
    editEnabled.value = false
    await (handler as Function)()
    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/')
  })

  it('redirects to / when needsLogin is true', async () => {
    needsLogin.value = true
    await (handler as Function)()
    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/')
  })

  it('redirects to / when offline, without checking auth', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    await (handler as Function)()
    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/')
    expect(mockUseAuth).not.toHaveBeenCalled()
  })
})
