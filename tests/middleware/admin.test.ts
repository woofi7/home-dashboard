import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const editEnabled = ref(true)
const needsLogin = ref(false)
let readyResolve!: () => void

const mockUseAuth = vi.fn(() => ({
  editEnabled,
  needsLogin,
  ready: new Promise<void>(r => { readyResolve = r }),
}))
vi.stubGlobal('useAuth', mockUseAuth)

import handler from '~/middleware/admin'

beforeEach(() => {
  vi.stubGlobal('navigateTo', vi.fn())
  editEnabled.value = true
  needsLogin.value = false
  mockUseAuth.mockImplementation(() => ({
    editEnabled,
    needsLogin,
    ready: new Promise<void>(r => { readyResolve = r }),
  }))
})

describe('admin middleware', () => {
  it('allows access when authenticated and edit enabled', async () => {
    const p = (handler as Function)()
    readyResolve()
    await p
    expect((globalThis as any).navigateTo).not.toHaveBeenCalled()
  })

  it('redirects to / when edit is not enabled', async () => {
    editEnabled.value = false
    const p = (handler as Function)()
    readyResolve()
    await p
    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/')
  })

  it('redirects to / when needsLogin is true', async () => {
    needsLogin.value = true
    const p = (handler as Function)()
    readyResolve()
    await p
    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/')
  })
})
