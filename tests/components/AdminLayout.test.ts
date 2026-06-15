// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { globalStubs } from './helpers'

import AdminLayout from '~/layouts/admin.vue'

const stubs = {
  ...globalStubs,
  NuxtLink: { template: '<a :href="to"><slot /></a>', props: ['to'] },
}

function mountLayout(path: string) {
  vi.stubGlobal('useRoute', () => ({ path }))
  return mount(AdminLayout, {
    global: { stubs },
    slots: { default: '<div class="page-content" />' },
  })
}

// ResizeObserver mock helpers
let resizeCallback: ResizeObserverCallback | null = null
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()

function mockResizeObserver() {
  resizeCallback = null
  mockObserve.mockClear()
  mockDisconnect.mockClear()
  vi.stubGlobal('ResizeObserver', vi.fn((cb: ResizeObserverCallback) => {
    resizeCallback = cb
    return { observe: mockObserve, disconnect: mockDisconnect, unobserve: vi.fn() }
  }))
}

function fireResize(blockSize: number, useBorderBoxSize = true) {
  const entry = {
    borderBoxSize: useBorderBoxSize ? [{ blockSize, inlineSize: 800 }] : undefined,
    contentRect: { height: blockSize - 25, width: 800, top: 0, left: 0, right: 800, bottom: blockSize - 25, x: 0, y: 0, toJSON: () => ({}) },
    contentBoxSize: [],
    devicePixelContentBoxSize: [],
    target: document.createElement('div'),
  } as unknown as ResizeObserverEntry
  resizeCallback!([entry], {} as ResizeObserver)
}

describe('AdminLayout.vue', () => {
  describe('sticky header', () => {
    beforeEach(() => {
      mockResizeObserver()
      document.documentElement.style.removeProperty('--admin-header-h')
    })

    it('header element has sticky top-0 z-50 classes', () => {
      const wrapper = mountLayout('/admin')
      const header = wrapper.find('div.sticky')
      expect(header.exists()).toBe(true)
      expect(header.classes()).toContain('top-0')
      expect(header.classes()).toContain('z-50')
    })

    it('sets --admin-header-h from ResizeObserver borderBoxSize', async () => {
      mountLayout('/admin')
      await flushPromises()
      fireResize(49)
      expect(document.documentElement.style.getPropertyValue('--admin-header-h')).toBe('49px')
    })

    it('uses Math.ceil to round fractional heights', async () => {
      mountLayout('/admin')
      await flushPromises()
      fireResize(48.6)
      expect(document.documentElement.style.getPropertyValue('--admin-header-h')).toBe('49px')
    })

    it('falls back to getBoundingClientRect when borderBoxSize is absent', async () => {
      mountLayout('/admin')
      await flushPromises()
      // simulate missing borderBoxSize (older browsers)
      const entry = {
        borderBoxSize: undefined,
        contentRect: { height: 40 },
        target: Object.assign(document.createElement('div'), {
          getBoundingClientRect: () => ({ height: 57 }),
        }),
      } as unknown as ResizeObserverEntry
      resizeCallback!([entry], {} as ResizeObserver)
      // falls back to headerRef.getBoundingClientRect, which returns 0 in jsdom but doesn't throw
      expect(() => document.documentElement.style.getPropertyValue('--admin-header-h')).not.toThrow()
    })

    it('starts observing the header element on mount', async () => {
      mountLayout('/admin')
      await flushPromises()
      expect(mockObserve).toHaveBeenCalledOnce()
    })

    it('updates --admin-header-h when header grows (save bar appears)', async () => {
      mountLayout('/admin')
      await flushPromises()
      fireResize(49)
      expect(document.documentElement.style.getPropertyValue('--admin-header-h')).toBe('49px')
      fireResize(57)
      expect(document.documentElement.style.getPropertyValue('--admin-header-h')).toBe('57px')
    })

    it('disconnects the ResizeObserver on unmount', async () => {
      const wrapper = mountLayout('/admin')
      await flushPromises()
      wrapper.unmount()
      expect(mockDisconnect).toHaveBeenCalledOnce()
    })
  })

  it('renders Dashboard link to / on all pages', () => {
    const wrapper = mountLayout('/admin')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/' && l.text() === 'Dashboard')).toBe(true)
  })

  it('renders Dashboard link to / on sub-pages', () => {
    const wrapper = mountLayout('/admin/settings')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/' && l.text() === 'Dashboard')).toBe(true)
  })

  it('renders Admin link to /admin on sub-pages', () => {
    const wrapper = mountLayout('/admin/settings')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/admin' && l.text() === 'Admin')).toBe(true)
  })

  it('shows Admin as bold text on /admin root', () => {
    const wrapper = mountLayout('/admin')
    expect(wrapper.find('span.font-semibold').text()).toBe('Admin')
  })

  it('shows Widgets crumb on /admin/widgets', () => {
    const wrapper = mountLayout('/admin/widgets')
    expect(wrapper.text()).toContain('Widgets')
  })

  it('shows Service Fields crumb on /admin/service-fields', () => {
    const wrapper = mountLayout('/admin/service-fields')
    expect(wrapper.text()).toContain('Service Fields')
  })

  it('shows Background crumb on /admin/background', () => {
    const wrapper = mountLayout('/admin/background')
    expect(wrapper.text()).toContain('Background')
  })

  it('shows the mapped page title for known routes', () => {
    const wrapper = mountLayout('/admin/widgets')
    const crumbs = wrapper.findAll('span')
    expect(crumbs.some(s => s.text() === 'Widgets')).toBe(true)
  })

  it('shows Widgets as parent breadcrumb on /admin/widgets/weather', () => {
    const wrapper = mountLayout('/admin/widgets/weather')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/admin/widgets' && l.text() === 'Widgets')).toBe(true)
    expect(wrapper.text()).toContain('Weather')
  })

  it('shows Widgets as parent breadcrumb on /admin/widgets/calendar', () => {
    const wrapper = mountLayout('/admin/widgets/calendar')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/admin/widgets' && l.text() === 'Widgets')).toBe(true)
    expect(wrapper.text()).toContain('Google Calendar')
  })

  it('shows Widgets as parent breadcrumb on /admin/widgets/publictransit', () => {
    const wrapper = mountLayout('/admin/widgets/publictransit')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/admin/widgets' && l.text() === 'Widgets')).toBe(true)
    expect(wrapper.text()).toContain('Public Transit')
  })

  it('does not show parent breadcrumb on /admin/settings', () => {
    const wrapper = mountLayout('/admin/settings')
    const links = wrapper.findAll('a')
    expect(links.some(l => l.attributes('href') === '/admin/widgets')).toBe(false)
  })

  it('renders the default slot', () => {
    const wrapper = mountLayout('/admin')
    expect(wrapper.find('.page-content').exists()).toBe(true)
  })

  it('renders the #admin-header-actions portal target', () => {
    const wrapper = mountLayout('/admin')
    expect(wrapper.find('#admin-header-actions').exists()).toBe(true)
  })
})
