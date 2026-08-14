// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

const mockLogin = vi.fn()
const mockSetup = vi.fn()
const tokenConfigured = ref(true)

vi.stubGlobal('useAuth', () => ({
  tokenConfigured,
  login: mockLogin,
  setup: mockSetup,
}))

import AuthGate from '~/components/auth/AuthGate.vue'

function mountGate() {
  return mount(AuthGate, { global: { stubs: globalStubs } })
}

beforeEach(() => {
  mockLogin.mockReset()
  mockSetup.mockReset()
  tokenConfigured.value = true
})

describe('AuthGate.vue - login mode (password already set)', () => {
  it('shows the login form, not the setup form', () => {
    const w = mountGate()
    expect(w.text()).toContain('Password required')
    expect(w.findAll('input').length).toBe(1)
  })

  it('calls login and does not show a confirm field', async () => {
    mockLogin.mockResolvedValueOnce(true)
    const w = mountGate()
    await w.find('input').setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(mockLogin).toHaveBeenCalledWith('secret')
    expect(mockSetup).not.toHaveBeenCalled()
  })

  it('shows an error on wrong password', async () => {
    mockLogin.mockResolvedValueOnce(false)
    const w = mountGate()
    await w.find('input').setValue('wrong')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Wrong password')
  })
})

describe('AuthGate.vue - setup mode (no password configured yet)', () => {
  beforeEach(() => {
    tokenConfigured.value = false
  })

  it('shows the setup form with a confirm field', () => {
    const w = mountGate()
    expect(w.text()).toContain('Set a dashboard password')
    expect(w.findAll('input').length).toBe(2)
  })

  it('rejects mismatched passwords without calling setup', async () => {
    const w = mountGate()
    const inputs = w.findAll('input')
    await inputs[0]!.setValue('pass1')
    await inputs[1]!.setValue('pass2')
    await w.find('form').trigger('submit')
    expect(w.text()).toContain('do not match')
    expect(mockSetup).not.toHaveBeenCalled()
  })

  it('calls setup with matching passwords', async () => {
    mockSetup.mockResolvedValueOnce(true)
    const w = mountGate()
    const inputs = w.findAll('input')
    await inputs[0]!.setValue('secret')
    await inputs[1]!.setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(mockSetup).toHaveBeenCalledWith('secret')
    expect(mockLogin).not.toHaveBeenCalled()
  })
})
