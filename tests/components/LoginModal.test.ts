// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'

const mockLogin = vi.fn()
vi.stubGlobal('useAuth', () => ({ login: mockLogin }))

import LoginModal from '~/components/edit/LoginModal.vue'

describe('LoginModal.vue', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  function mountModal() {
    return mount(LoginModal, {
      global: { stubs: globalStubs },
      attachTo: document.body,
    })
  }

  it('renders "Enter password" heading', () => {
    const wrapper = mountModal()
    expect(wrapper.find('h2').text()).toBe('Enter password')
  })

  it('submit button is disabled when password input is empty', () => {
    const wrapper = mountModal()
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('submit button shows "Unlock" initially (not loading)', () => {
    const wrapper = mountModal()
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toBe('Unlock')
  })

  it('clicking Cancel emits close', async () => {
    const wrapper = mountModal()
    const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('clicking backdrop emits close', async () => {
    const wrapper = mountModal()
    await wrapper.find('.fixed').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('filling password and submitting calls login(password)', async () => {
    mockLogin.mockResolvedValue(true)
    const wrapper = mountModal()
    const input = wrapper.find('input[type="password"]')
    await input.setValue('secret123')
    await wrapper.find('form').trigger('submit')
    expect(mockLogin).toHaveBeenCalledWith('secret123')
  })

  it('successful login emits success', async () => {
    mockLogin.mockResolvedValue(true)
    const wrapper = mountModal()
    await wrapper.find('input[type="password"]').setValue('correct')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('failed login shows "Wrong password" error and does NOT emit success', async () => {
    mockLogin.mockResolvedValue(false)
    const wrapper = mountModal()
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('success')).toBeFalsy()
    expect(wrapper.text()).toContain('Wrong password')
  })

  it('submit button shows "..." while loading', async () => {
    let resolveLogin!: (v: boolean) => void
    mockLogin.mockReturnValue(new Promise<boolean>(r => { resolveLogin = r }))
    const wrapper = mountModal()
    await wrapper.find('input[type="password"]').setValue('pass')
    wrapper.find('form').trigger('submit')
    await flushPromises()
    // loading is true while promise is pending
    expect(wrapper.find('button[type="submit"]').text()).toBe('...')
    resolveLogin(true)
    await flushPromises()
  })

  it('submit button is disabled while loading', async () => {
    let resolveLogin!: (v: boolean) => void
    mockLogin.mockReturnValue(new Promise<boolean>(r => { resolveLogin = r }))
    const wrapper = mountModal()
    await wrapper.find('input[type="password"]').setValue('pass')
    wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    resolveLogin(false)
    await flushPromises()
  })

  it('error clears when another submit starts', async () => {
    mockLogin.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const wrapper = mountModal()
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Wrong password')
    // Submit again
    await wrapper.find('input[type="password"]').setValue('right')
    await wrapper.find('form').trigger('submit')
    // During loading, error is cleared
    await flushPromises()
    expect(wrapper.find('p.text-danger').exists()).toBe(false)
  })
})
