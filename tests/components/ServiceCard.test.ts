// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { globalStubs } from './helpers'

const dockerStatus = ref<Record<string, Record<string, { state: string; status: string }>>>({})
const pingStatus = ref<Record<string, boolean>>({})
const widgetData = ref<Record<string, { fields: { label: string; value: unknown }[] } | { error: { kind: string; status?: number; message?: string } }>>({})

const globalSettingsData = ref<{ linkTarget?: 'new-tab' | 'same-tab' }>({})
vi.stubGlobal('useGlobalSettings', () => ({ settings: computed(() => globalSettingsData.value) }))

import { useStatusStore } from '~/stores/status'
import { useConnectivityStore } from '~/stores/connectivity'
import ServiceCard from '~/components/layout/ServiceCard.vue'

type Service = {
  name: string
  url?: string
  icon?: string
  description?: string
  type?: string
  container?: string
  server?: string
  healthcheck?: string
}

function mountCard(service: Partial<Service> & { name: string }, overrides: { edit?: boolean; pending?: boolean; pendingDelete?: boolean } = {}) {
  const store = useStatusStore()
  store.dockerStatus = dockerStatus.value
  store.pingStatus = pingStatus.value
  store.widgetData = widgetData.value
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

  it('normalizes a scheme-less URL to http in the href', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: '10.0.1.2:8200' })
    expect(wrapper.element.getAttribute('href')).toBe('http://10.0.1.2:8200')
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
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Docker container: Up 2 hours')
  })

  it('status dot title shows Reachable for ping up', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('HTTP ping http://sonarr: Reachable')
  })

  it('status dot title shows Unreachable for ping down', () => {
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('HTTP ping http://sonarr: Unreachable')
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

  it('shows the full error inline (label and message) when the widget errors', () => {
    widgetData.value = { Sonarr: { error: { kind: 'auth', status: 401, message: 'Credentials refused' } } }
    const wrapper = mountCard({ name: 'Sonarr', type: 'sonarr' })
    const el = wrapper.find('.text-danger\\/70')
    expect(el.text()).toBe('Auth failed (401) - Credentials refused')
    expect(el.attributes('title')).toBeUndefined()
  })

  it('shows the full inline message for an unreachable widget error', () => {
    widgetData.value = { Sonarr: { error: { kind: 'unreachable', message: 'Server not responding (ECONNREFUSED)' } } }
    const wrapper = mountCard({ name: 'Sonarr', type: 'sonarr' })
    expect(wrapper.text()).toContain('Unreachable - Server not responding (ECONNREFUSED)')
  })

  it('shows no error text while the widget result is still loading', () => {
    widgetData.value = {}
    const wrapper = mountCard({ name: 'Sonarr', type: 'sonarr' })
    expect(wrapper.find('.text-danger\\/70').exists()).toBe(false)
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

describe('ServiceCard.vue — Link target', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
    globalSettingsData.value = {}
  })

  it('opens in new tab by default', () => {
    globalSettingsData.value = {}
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.element.getAttribute('target')).toBe('_blank')
  })

  it('opens in new tab when linkTarget is new-tab', () => {
    globalSettingsData.value = { linkTarget: 'new-tab' }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.element.getAttribute('target')).toBe('_blank')
  })

  it('opens in same tab when linkTarget is same-tab', () => {
    globalSettingsData.value = { linkTarget: 'same-tab' }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.element.getAttribute('target')).toBe('_self')
  })
})

describe('ServiceCard.vue — Healthcheck', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
    globalSettingsData.value = {}
  })

  it('healthcheck:none hides status dot even when ping data exists', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'none' })
    expect(wrapper.find('span.rounded-full').exists()).toBe(false)
  })

  it('healthcheck:none hides status dot even when Docker data exists', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'running', status: 'Up 2h' } } }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'none' })
    expect(wrapper.find('span.rounded-full').exists()).toBe(false)
  })

  it('healthcheck:docker shows Docker status, ignores ping', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'running', status: 'Up 2h' } } }
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'docker' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('healthcheck:docker shows no dot when no Docker data (no ping fallback)', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'docker' })
    expect(wrapper.find('span.rounded-full').exists()).toBe(false)
  })

  it('healthcheck:http uses ping status, ignores Docker', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'exited', status: 'Exited (0)' } } }
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('healthcheck with custom URL pings that URL, not service URL', () => {
    pingStatus.value = { 'http://sonarr/health': true, 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http://sonarr/health' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('healthcheck with custom URL shows red when custom URL is down', () => {
    pingStatus.value = { 'http://sonarr/health': false, 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http://sonarr/health' })
    expect(wrapper.find('span.bg-red-400').exists()).toBe(true)
  })

  it('auto behavior: Docker takes precedence over ping when no healthcheck set', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'running', status: 'Up 2h' } } }
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('auto behavior: falls back to ping when no Docker data', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('auto behavior: falls back to HTTP ping (green) when Docker container is down but service responds', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'exited', status: 'Exited (1) 2 hours ago' } } }
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('HTTP ping http://sonarr: Reachable')
  })

  it('auto behavior: falls back to HTTP ping (green) when Docker container is unhealthy but service responds', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'running', status: 'Up 2 hours (unhealthy)' } } }
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-green-400').exists()).toBe(true)
  })

  it('auto behavior: keeps Docker failure color when ping also fails', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'exited', status: 'Exited (1) 2 hours ago' } } }
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', server: 'nas' })
    expect(wrapper.find('span.bg-red-400').exists()).toBe(true)
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Docker container on nas: Exited (1) 2 hours ago')
  })

  it('auto behavior: keeps Docker failure color when no ping data is available', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'exited', status: 'Exited (1) 2 hours ago' } } }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-red-400').exists()).toBe(true)
  })

  it('docker-only healthcheck does not fall back to HTTP when container is down', () => {
    dockerStatus.value = { nas: { sonarr: { state: 'exited', status: 'Exited (1)' } } }
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'docker' })
    expect(wrapper.find('span.bg-red-400').exists()).toBe(true)
    expect(wrapper.find('span.bg-green-400').exists()).toBe(false)
  })

  it('status dot title names HTTP ping with the service URL', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('HTTP ping http://sonarr: Reachable')
  })

  it('status dot title includes custom URL when using custom healthcheck URL', () => {
    pingStatus.value = { 'http://sonarr/health': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http://sonarr/health' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toContain('http://sonarr/health')
    expect(wrapper.find('span.rounded-full').attributes('title')).toContain('Reachable')
  })

  it('status dot title includes custom URL when unreachable', () => {
    pingStatus.value = { 'http://sonarr/health': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http://sonarr/health' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toContain('http://sonarr/health')
    expect(wrapper.find('span.rounded-full').attributes('title')).toContain('Unreachable')
  })
})

describe('ServiceCard.vue — Offline mode', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('forces a yellow dot when offline, overriding a green container status', () => {
    useConnectivityStore().online = false
    dockerStatus.value = { nas: { sonarr: { state: 'running', status: 'Up 2 hours' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('span.bg-yellow-400').exists()).toBe(true)
    expect(wrapper.find('span.bg-green-400').exists()).toBe(false)
  })

  it('forces a yellow dot when offline, overriding a red ping status', () => {
    useConnectivityStore().online = false
    pingStatus.value = { 'http://sonarr': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-yellow-400').exists()).toBe(true)
    expect(wrapper.find('span.bg-red-400').exists()).toBe(false)
  })

  it('shows a yellow dot when offline even with no cached status data', () => {
    useConnectivityStore().online = false
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.bg-yellow-400').exists()).toBe(true)
  })

  it('still hides the dot for healthcheck:none when offline', () => {
    useConnectivityStore().online = false
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'none' })
    expect(wrapper.find('span.rounded-full').exists()).toBe(false)
  })

  it('offline dot title reports status is unavailable', () => {
    useConnectivityStore().online = false
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toContain('Offline')
  })
})

describe('ServiceCard.vue — Drag handle', () => {
  it('shows handle when edit=true', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' }, { edit: true })
    expect(wrapper.find('.service-handle').exists()).toBe(true)
  })

  it('does not show handle when edit=false', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('.service-handle').exists()).toBe(false)
  })

  it('handle has hover background class', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' }, { edit: true })
    expect(wrapper.find('.service-handle').classes()).toContain('hover:bg-elevated')
  })

  it('handle has hover text class', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' }, { edit: true })
    expect(wrapper.find('.service-handle').classes()).toContain('hover:text-primary')
  })

  it('handle has transition-colors class', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' }, { edit: true })
    expect(wrapper.find('.service-handle').classes()).toContain('transition-colors')
  })

  it('handle renders grip-vertical icon', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' }, { edit: true })
    expect(wrapper.find('.service-handle').find('[data-icon="grip-vertical"]').exists()).toBe(true)
  })
})

describe('ServiceCard.vue — Server/container label', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('shows server and container as "server/container"', () => {
    const wrapper = mountCard({ name: 'Sonarr', server: 'roger', container: 'sonarr-app' })
    expect(wrapper.find('[data-icon="server"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('roger/sonarr-app')
  })

  it('shows only the container when no server configured', () => {
    const wrapper = mountCard({ name: 'Sonarr', container: 'sonarr-app' })
    expect(wrapper.text()).toContain('sonarr-app')
    expect(wrapper.text()).not.toContain('/')
  })

  it('shows only the server when no container configured', () => {
    const wrapper = mountCard({ name: 'Sonarr', server: 'roger' })
    expect(wrapper.text()).toContain('roger')
  })

  it('hides the label when neither server nor container is configured', () => {
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('[data-icon="server"]').exists()).toBe(false)
  })
})

describe('ServiceCard.vue — Healthcheck method in tooltip', () => {
  beforeEach(() => {
    dockerStatus.value = {}
    pingStatus.value = {}
    widgetData.value = {}
  })

  it('tooltip names Docker container and includes the server', () => {
    dockerStatus.value = { roger: { sonarr: { state: 'running', status: 'Up 2 hours' } } }
    const wrapper = mountCard({ name: 'Sonarr', server: 'roger' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Docker container on roger: Up 2 hours')
  })

  it('tooltip names Docker container without server when none configured', () => {
    dockerStatus.value = { roger: { sonarr: { state: 'running', status: 'Up 2 hours' } } }
    const wrapper = mountCard({ name: 'Sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('Docker container: Up 2 hours')
  })

  it('tooltip names HTTP ping and includes the pinged URL', () => {
    pingStatus.value = { 'http://sonarr': true }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('HTTP ping http://sonarr: Reachable')
  })

  it('tooltip names HTTP ping with the custom healthcheck URL', () => {
    pingStatus.value = { 'http://sonarr/health': false }
    const wrapper = mountCard({ name: 'Sonarr', url: 'http://sonarr', healthcheck: 'http://sonarr/health' })
    expect(wrapper.find('span.rounded-full').attributes('title')).toBe('HTTP ping http://sonarr/health: Unreachable')
  })
})
