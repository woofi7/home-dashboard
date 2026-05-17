// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import ConfirmModal from '~/components/edit/ConfirmModal.vue'

describe('ConfirmModal.vue', () => {
  function mountModal(message = 'Are you sure?') {
    return mount(ConfirmModal, {
      props: { message },
      global: { stubs: globalStubs },
    })
  }

  it('renders the message prop', () => {
    const wrapper = mountModal('Unsaved changes will be lost')
    expect(wrapper.text()).toContain('Unsaved changes will be lost')
  })

  it('"Discard & leave" button click emits confirm', async () => {
    const wrapper = mountModal()
    await wrapper.find('button.bg-danger').trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('"Stay" button click emits cancel', async () => {
    const wrapper = mountModal()
    // Find the Stay button (not the danger one)
    const buttons = wrapper.findAll('button')
    const stayBtn = buttons.find(b => b.text() === 'Stay')
    expect(stayBtn).toBeTruthy()
    await stayBtn!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('clicking the backdrop div emits cancel', async () => {
    const wrapper = mountModal()
    // The Teleport stub renders a div; find the .fixed backdrop
    await wrapper.find('.fixed').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
