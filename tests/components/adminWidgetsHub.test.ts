// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useAuth', () => ({ editEnabled: ref(true), needsLogin: ref(false) }))

const mockRefresh = vi.fn()
const enabledData = ref({ calendar: true, weather: true, publictransit: true })
vi.stubGlobal('useFetch', vi.fn(() => ({ data: enabledData, refresh: mockRefresh })))

const mockFetch = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('$fetch', mockFetch)

import AdminWidgetsHub from '~/pages/admin/widgets/index.vue'

function mountPage() {
  return mount(AdminWidgetsHub, {
    global: {
      stubs: {
        ...globalStubs,
        NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
        FaIcon: { template: '<span class="fa-icon" :data-icon="icon" />', props: ['icon'] },
      },
    },
  })
}

describe('admin/widgets.vue (hub)', () => {
  beforeEach(() => {
    enabledData.value = { calendar: true, weather: true, publictransit: true }
    mockFetch.mockClear()
    mockRefresh.mockClear()
  })

  it('renders 3 nav cards', () => {
    expect(mountPage().findAll('a').length).toBe(3)
  })

  it('renders a Google Calendar card linking to /admin/widgets/calendar', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/widgets/calendar')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Google Calendar')
  })

  it('renders a Public Transit card linking to /admin/widgets/publictransit', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/widgets/publictransit')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Public Transit')
  })

  it('renders a Weather card linking to /admin/widgets/weather', () => {
    const links = mountPage().findAll('a')
    const card = links.find(l => l.attributes('href') === '/admin/widgets/weather')
    expect(card).toBeTruthy()
    expect(card!.text()).toContain('Weather')
  })

  it('renders a toggle button for each widget card', () => {
    const wrapper = mountPage()
    const toggles = wrapper.findAll('button')
    expect(toggles.length).toBe(3)
  })

  it('calls $fetch with correct body when toggle is clicked', async () => {
    enabledData.value = { calendar: true, weather: true, publictransit: false }
    const wrapper = mountPage()
    const buttons = wrapper.findAll('button')
    await buttons[2]!.trigger('click')
    await flushPromises()
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/widget-enabled', {
      method: 'POST',
      body: { widget: 'weather', enabled: false },
    })
  })

  it('calls refresh after toggling', async () => {
    const wrapper = mountPage()
    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    await flushPromises()
    expect(mockRefresh).toHaveBeenCalled()
  })
})
