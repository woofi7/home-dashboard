// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useAuth', () => ({
  editEnabled: ref(true),
  needsLogin: ref(false),
}))

import AdminIndex from '~/pages/admin/index.vue'

function mountPage() {
  return mount(AdminIndex, {
    global: {
      stubs: {
        ...globalStubs,
        NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
        FaIcon: { template: '<span class="fa-icon" :data-icon="icon" />', props: ['icon'] },
      },
    },
  })
}

describe('admin/index.vue', () => {
  it('renders a Settings heading', () => {
    const wrapper = mountPage()
    expect(wrapper.find('h1').text()).toBe('Settings')
  })

  it('renders a Widgets card linking to /admin/widgets', () => {
    const wrapper = mountPage()
    const links = wrapper.findAll('a')
    const widgetsCard = links.find(l => l.attributes('href') === '/admin/widgets')
    expect(widgetsCard).toBeTruthy()
    expect(widgetsCard!.text()).toContain('Widgets')
  })

  it('renders a Background card linking to /admin/background', () => {
    const wrapper = mountPage()
    const links = wrapper.findAll('a')
    const bgCard = links.find(l => l.attributes('href') === '/admin/background')
    expect(bgCard).toBeTruthy()
    expect(bgCard!.text()).toContain('Background')
  })

  it('uses sliders icon for the Widgets card', () => {
    const wrapper = mountPage()
    const icons = wrapper.findAll('.fa-icon')
    expect(icons.some(i => i.attributes('data-icon') === 'sliders')).toBe(true)
  })

  it('uses image icon for the Background card', () => {
    const wrapper = mountPage()
    const icons = wrapper.findAll('.fa-icon')
    expect(icons.some(i => i.attributes('data-icon') === 'image')).toBe(true)
  })

  it('renders a Google Calendar card linking to /admin/calendar', () => {
    const wrapper = mountPage()
    const links = wrapper.findAll('a')
    const calCard = links.find(l => l.attributes('href') === '/admin/calendar')
    expect(calCard).toBeTruthy()
    expect(calCard!.text()).toContain('Google Calendar')
  })

  it('uses calendar-days icon for the Google Calendar card', () => {
    const wrapper = mountPage()
    const icons = wrapper.findAll('.fa-icon')
    expect(icons.some(i => i.attributes('data-icon') === 'calendar-days')).toBe(true)
  })

  it('renders exactly 3 setting cards', () => {
    const wrapper = mountPage()
    expect(wrapper.findAll('a').length).toBe(3)
  })
})
