// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'

const mockSetup = vi.fn()
vi.stubGlobal('useAuth', () => ({ setup: mockSetup }))

import SetupTokenModal from '~/components/edit/SetupTokenModal.vue'

function mountModal() {
  return mount(SetupTokenModal, {
    global: { stubs: globalStubs },
  })
}

beforeEach(() => {
  mockSetup.mockReset()
})

describe('SetupTokenModal.vue', () => {
  it('renders the heading', () => {
    expect(mountModal().text()).toContain('Set up admin access')
  })

  it('submit button is disabled when fields are empty', () => {
    const w = mountModal()
    const btn = w.findAll('button').find(b => b.text().includes('Set password'))!
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('submit button is disabled when only password is filled', async () => {
    const w = mountModal()
    await w.findAll('input')[0]!.setValue('mypass')
    const btn = w.findAll('button').find(b => b.text().includes('Set password'))!
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('shows mismatch error when passwords differ', async () => {
    const w = mountModal()
    await w.findAll('input')[0]!.setValue('pass1')
    await w.findAll('input')[1]!.setValue('pass2')
    await w.find('form').trigger('submit')
    expect(w.text()).toContain('do not match')
    expect(mockSetup).not.toHaveBeenCalled()
  })

  it('calls setup and emits success on matching passwords', async () => {
    mockSetup.mockResolvedValueOnce(true)
    const w = mountModal()
    await w.findAll('input')[0]!.setValue('secret')
    await w.findAll('input')[1]!.setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(mockSetup).toHaveBeenCalledWith('secret')
    expect(w.emitted('success')).toBeTruthy()
  })

  it('shows error when setup returns false', async () => {
    mockSetup.mockResolvedValueOnce(false)
    const w = mountModal()
    await w.findAll('input')[0]!.setValue('secret')
    await w.findAll('input')[1]!.setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.emitted('success')).toBeFalsy()
    expect(w.text()).toContain('Setup failed')
  })

  it('emits close when Cancel is clicked', async () => {
    const w = mountModal()
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })
})
