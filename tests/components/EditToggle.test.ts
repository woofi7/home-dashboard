// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { globalStubs } from './helpers'
import EditToggle from '~/components/edit/EditToggle.vue'

const defaultProps = {
  active: false,
  dirty: false,
  pendingCount: 0,
  countdown: 30,
  editEnabled: false,
  locked: false,
}

function mountToggle(props: Partial<typeof defaultProps> = {}) {
  return mount(EditToggle, {
    props: { ...defaultProps, ...props },
    global: { stubs: globalStubs },
  })
}

describe('EditToggle.vue', () => {
  it('shows only refresh button when active=false and editEnabled=false', () => {
    const wrapper = mountToggle({ active: false, editEnabled: false })
    expect(wrapper.find('button').exists()).toBe(true)
    // No Edit button, no Save button
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().includes('Edit'))).toBe(false)
    expect(buttons.some(b => b.text().includes('Save'))).toBe(false)
  })

  it('shows Edit button when active=false and editEnabled=true', () => {
    const wrapper = mountToggle({ active: false, editEnabled: true })
    expect(wrapper.findAll('button').some(b => b.text().includes('Edit'))).toBe(true)
  })

  it('shows countdown value on the refresh button', () => {
    const wrapper = mountToggle({ active: false, editEnabled: false, countdown: 42 })
    expect(wrapper.find('button').text()).toContain('42s')
  })

  it('shows Save, Cancel, logout and Admin link when active=true', () => {
    const wrapper = mountToggle({ active: true })
    const text = wrapper.text()
    expect(text).toContain('Save')
    expect(text).toContain('Cancel')
    expect(text).toContain('Admin')
    // logout button has FaIcon only — check it exists via title
    const logoutBtn = wrapper.find('button[title="Logout"]')
    expect(logoutBtn.exists()).toBe(true)
  })

  it('Save button is disabled when dirty=false', () => {
    const wrapper = mountToggle({ active: true, dirty: false })
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Save'))
    expect(saveBtn!.attributes('disabled')).toBeDefined()
  })

  it('Save button is not disabled when dirty=true', () => {
    const wrapper = mountToggle({ active: true, dirty: true })
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Save'))
    expect(saveBtn!.attributes('disabled')).toBeUndefined()
  })

  it('shows pendingCount badge when pendingCount > 0', () => {
    const wrapper = mountToggle({ active: true, dirty: true, pendingCount: 3 })
    const badge = wrapper.find('span.bg-warning')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('3')
  })

  it('does not show pendingCount badge when pendingCount === 0', () => {
    const wrapper = mountToggle({ active: true, dirty: true, pendingCount: 0 })
    expect(wrapper.find('span.bg-warning').exists()).toBe(false)
  })

  it('clicking refresh button emits refresh', async () => {
    const wrapper = mountToggle({ active: false, editEnabled: false })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('clicking Edit emits edit', async () => {
    const wrapper = mountToggle({ active: false, editEnabled: true })
    const editBtn = wrapper.findAll('button').find(b => b.text().includes('Edit'))
    await editBtn!.trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
  })

  it('clicking Cancel emits rollback', async () => {
    const wrapper = mountToggle({ active: true })
    const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Cancel'))
    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('rollback')).toBeTruthy()
  })

  it('clicking Save emits save', async () => {
    const wrapper = mountToggle({ active: true, dirty: true })
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Save'))
    await saveBtn!.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('clicking logout emits logout', async () => {
    const wrapper = mountToggle({ active: true })
    const logoutBtn = wrapper.find('button[title="Logout"]')
    await logoutBtn.trigger('click')
    expect(wrapper.emitted('logout')).toBeTruthy()
  })
})
