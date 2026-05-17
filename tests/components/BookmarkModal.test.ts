// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import BookmarkModal from '~/components/edit/BookmarkModal.vue'

type Bookmark = { name: string; url: string; icon?: string }

function mountModal(bookmark: Bookmark | null = null) {
  return mount(BookmarkModal, {
    props: { bookmark },
    global: { stubs: globalStubs },
  })
}

describe('BookmarkModal.vue', () => {
  it('shows "Add bookmark" title when bookmark prop is null', () => {
    const wrapper = mountModal(null)
    expect(wrapper.find('h2').text()).toBe('Add bookmark')
  })

  it('shows "Edit bookmark" title when bookmark prop is provided', () => {
    const wrapper = mountModal({ name: 'GitHub', url: 'https://github.com' })
    expect(wrapper.find('h2').text()).toBe('Edit bookmark')
  })

  it('pre-fills name, url, icon from bookmark prop when editing', () => {
    const wrapper = mountModal({ name: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico' })
    const inputs = wrapper.findAll('input')
    // name, url, icon inputs in order
    expect(inputs[0].element.value).toBe('GitHub')
    expect(inputs[1].element.value).toBe('https://github.com')
    expect(inputs[2].element.value).toBe('https://github.com/favicon.ico')
  })

  it('has empty form when adding (bookmark=null)', () => {
    const wrapper = mountModal(null)
    const inputs = wrapper.findAll('input')
    expect(inputs[0].element.value).toBe('')
    expect(inputs[1].element.value).toBe('')
    expect(inputs[2].element.value).toBe('')
  })

  it('clicking X (close) button emits close', async () => {
    const wrapper = mountModal(null)
    // X button is the one with xmark fa-icon
    const header = wrapper.find('.px-6.py-4.border-b')
    const closeBtn = header.find('button')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('clicking Cancel button emits close', async () => {
    const wrapper = mountModal(null)
    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find(b => b.text() === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('clicking Save with empty name shows "Name is required" error and does NOT emit save', async () => {
    const wrapper = mountModal(null)
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(wrapper.text()).toContain('Name is required')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('clicking Save with empty url shows "URL is required" error and does NOT emit save', async () => {
    const wrapper = mountModal(null)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('GitHub')
    // url is still empty
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(wrapper.text()).toContain('URL is required')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('clicking Save with valid name+url emits save with { name, url, icon }', async () => {
    const wrapper = mountModal(null)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('GitHub')
    await inputs[1].setValue('https://github.com')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
    const [payload] = wrapper.emitted('save')![0] as [Bookmark]
    expect(payload.name).toBe('GitHub')
    expect(payload.url).toBe('https://github.com')
  })

  it('name error clears when typing in name field', async () => {
    const wrapper = mountModal(null)
    const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
    await saveBtn!.trigger('click')
    expect(wrapper.text()).toContain('Name is required')
    // Trigger input event on name field
    await wrapper.findAll('input')[0].trigger('input')
    expect(wrapper.text()).not.toContain('Name is required')
  })

  it('shows img preview when icon value is set', async () => {
    const wrapper = mountModal({ name: 'G', url: 'http://x.com', icon: 'http://x.com/icon.png' })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe('http://x.com/icon.png')
  })

  it('does not show img preview when no icon', () => {
    const wrapper = mountModal({ name: 'G', url: 'http://x.com', icon: '' })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('Browse button sets showIconPicker = true (IconPicker appears)', async () => {
    const wrapper = mount(BookmarkModal, {
      props: { bookmark: null },
      global: {
        stubs: {
          ...globalStubs,
          // Use a real stub for IconPicker that is visible when rendered
          IconPicker: { template: '<div class="icon-picker-stub" />' },
        },
      },
    })
    expect(wrapper.find('.icon-picker-stub').exists()).toBe(false)
    const browseBtn = wrapper.findAll('button').find(b => b.text() === 'Browse')
    await browseBtn!.trigger('click')
    expect(wrapper.find('.icon-picker-stub').exists()).toBe(true)
  })

  it('Escape key press emits close', async () => {
    const { useEventListener } = await import('@vueuse/core')
    const mockFn = useEventListener as ReturnType<typeof vi.fn>
    mockFn.mockClear()
    const wrapper = mountModal(null)
    // find the keydown handler registered by the just-mounted component
    const keydownCall = mockFn.mock.calls.find(([event]: [string]) => event === 'keydown')
    expect(keydownCall).toBeTruthy()
    const handler = keydownCall[1] as (e: KeyboardEvent) => void
    handler(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('Enter key press with valid data emits save', async () => {
    const { useEventListener } = await import('@vueuse/core')
    const mockFn = useEventListener as ReturnType<typeof vi.fn>
    mockFn.mockClear()
    const wrapper = mountModal({ name: 'Test', url: 'http://test.com' })
    const keydownCall = mockFn.mock.calls.find(([event]: [string]) => event === 'keydown')
    expect(keydownCall).toBeTruthy()
    const handler = keydownCall[1] as (e: KeyboardEvent) => void
    handler(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})
