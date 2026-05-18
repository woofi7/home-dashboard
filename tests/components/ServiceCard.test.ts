// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { globalStubs } from './helpers'

const dockerStatus = ref<Record<string, Record<string, { state: string; status: string }>>>({})
const pingStatus = ref<Record<string, boolean>>({})
const widgetData = ref<Record<string, { fields: { label: string; value: unknown }[] } | null>>({})

vi.stubGlobal('useRefreshData', () => ({
  dockerStatus: computed(() => dockerStatus.value),
  pingStatus: computed(() => pingStatus.value),
  widgetData: computed(() => widgetData.value),
}))

// widgetRefresh stub so useRefreshData's internal composable doesn't fail
vi.stubGlobal('useWidgetRefresh', () => ({ refreshKey: ref(0), forceKey: ref(0) }))

import ServiceCard from '~/components/layout/ServiceCard.vue'

type Service = {
  name: string
  url?: string
  icon?: string
  description?: string
  type?: string
  container?: string
  server?: string
}

function mountCard(service: Partial<Service> & { name: string }, overrides: { edit?: boolean; pending?: boolean; pendingDelete?: boolean } = {}) {
  return mount(ServiceCard, {
    props: {
      service: service as Service,
      edit: overrides.edit ?? false,
      pending: overrides.pending ?? false,
      pendingDelete: overrides.pendingDelete ?? false,
    },
    global: { stubs: globalStubs },
  })
}

describe('ServiceCard.vue — Display', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('renders service name', () => {
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.text()).toContain('Sonarr')
  })

  it('renders description when present', () => {
    const wrapper = mountCard({ name: 'Sonarr', description: 'TV shows' })
    expect(wrapper.text()).toContain('TV shows')
  })

  it('does not render description element when absent', () => {
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('shows icon img when service.icon is set', () => {
    const wrapper = mountCard({ name: 'Sonarr', icon: 'http://icon.png' })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://icon.png')
    expect(img.attributes('alt')).toBe('Sonarr')
  })

  it('shows placeholder div when no icon', () => {
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('img').exists()).toBe(false)
    // placeholder div: w-8 h-8 rounded bg-surface
    expect(wrapper.find('div.w-8.h-8').exists()).toBe(true)
  })
})

describe('ServiceCard.vue — Link behavior', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('renders as <a> with correct href when NOT editing and has URL', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    const root = wrapper.element as HTMLElement
    expect(root.tagName).toBe('A')
    expect((root as HTMLAnchorElement).href).toContain('http://sonarr')
  })

  it('renders as <div> when editing=true (even with URL)', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' }, { edit: true })
    const root = wrapper.element as HTMLElement
    expect(root.tagName).toBe('DIV')
  })

  it('renders as <div> when no URL', () => {
    const wrapper = mountCard({ name: 'Sonarr' })
    const root = wrapper.element as HTMLElement
    expect(root.tagName).toBe('DIV')
  })
})

describe('ServiceCard.vue — Status dot', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('no status dot when no docker data and no ping data', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').exists()).toBe(false)
  })

  it('green status dot when container state is running (healthy)', () => {
    dockerStatus.value = { myserver: { sonarr: { state: 'running', status: 'Up 2 hours' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    const dot = wrapper.find('span.rounded-full')
    expect(dot.exists()).toBe(true)
    expect(dot.classes()).toContain('bg-green-400')
  })

  it('yellow status dot when container state is running but status contains (unhealthy)', () => {
    dockerStatus.value = { myserver: { sonarr: { state: 'running', status: 'Up 2 hours (unhealthy)' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    const dot = wrapper.find('span.rounded-full')
    expect(dot.classes()).toContain('bg-yellow-400')
  })

  it('yellow status dot when container state is restarting', () => {
    dockerStatus.value = { myserver: { sonarr: { state: 'restarting', status: 'Restarting (1) 5 seconds ago' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('span.bg-yellow-400').exists()).toBe(true)
  })

  it('yellow status dot when container state is paused', () => {
    dockerStatus.value = { myserver: { sonarr: { state: 'paused', status: 'Paused' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('span.bg-yellow-400').exists()).toBe(true)
  })

  it('red status dot when container state is exited', () => {
    dockerStatus.value = { myserver: { sonarr: { state: 'exited', status: 'Exited (1) 2 hours ago' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('span.bg-red-400').exists()).toBe(true)
  })

  it('green status dot when ping is up (no docker data)', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('red status dot when ping is down (no docker data)', () => {
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-red-400').exists()).toBe(true)
  })

  it('status dot title shows container status text when docker data available', () => {
    dockerStatus.value = { myserver: { sonarr: { state: 'running', status: 'Up 2 hours' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Up 2 hours')
  })

  it('status dot title shows Reachable for ping up', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Reachable')
  })

  it('status dot title shows Unreachable for ping down', () => {
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Unreachable')
  })
})

describe('ServiceCard.vue — Widget data', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('shows nothing when service has type but widgetData has no entry yet', () => {
    widgetData.value = {}
    const wrapper = mountCard({ name: 'Sonarr', type: 'sonarr' })
    expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Widget unavailable')
  })

  it('renders widget fields when available', () => {
    widgetData.value = { Sonarr: { fields: [{ label: 'Wanted', value: '5' }] } }
    const wrapper = mountCard({ name: 'Sonarr', type: 'sonarr' })
    expect(wrapper.text()).toContain('Wanted')
    expect(wrapper.text()).toContain('5')
  })

  it('shows widget error when widgetData has null for service name', () => {
    widgetData.value = { Sonarr: null }
    const wrapper = mountCard({ name: 'Sonarr', type: 'sonarr' })
    expect(wrapper.text()).toContain('Widget unavailable')
  })
})

describe('ServiceCard.vue — Edit mode buttons', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('edit button (pencil) visible when not pendingDelete', () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true })
    // pencil button: fa-icon with icon="pencil" → stub renders <span class="fa-icon">
    // find button containing pencil FaIcon — check for it by presence of buttons
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('delete button (xmark) visible when not pendingDelete', () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true })
    // Two action buttons: edit and delete
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('revert button (rotate-left) visible when pending=true', () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true, pending: true })
    // 3 buttons: revert, edit, delete
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('restore button visible when pendingDelete=true', () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true, pendingDelete: true })
    expect(wrapper.text()).toContain('Restore')
  })

  it('pencil button click emits edit', async () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true })
    // edit button is the second-to-last button (last is delete)
    const buttons = wrapper.findAll('button')
    // click the second-to-last (edit/pencil)
    await buttons[buttons.length - 2].trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
  })

  it('delete button click emits delete', async () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true })
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('rotate-left (revert) button click emits revert', async () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true, pending: true })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('revert')).toBeTruthy()
  })

  it('pendingDelete styling applied (border-danger, opacity)', () => {
    const wrapper = mountCard({ name: 'Sonarr' }, { edit: true, pendingDelete: true })
    const root = wrapper.element as HTMLElement
    expect(root.className).toContain('border-danger')
    expect(root.className).toContain('opacity-50')
  })
})
