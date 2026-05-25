// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('onBeforeRouteLeave', vi.fn())
vi.stubGlobal('useHead', vi.fn())
vi.stubGlobal('useFetch', () => ({ data: ref(null), refresh: vi.fn(), status: ref('success') }))
vi.stubGlobal('useRuntimeConfig', () => ({ public: { version: 'v1.2.3' } }))
vi.stubGlobal('useAuth', () => ({
  tokenConfigured: ref(true),
  editEnabled: ref(true),
  needsLogin: ref(false),
  logout: vi.fn(),
}))
vi.stubGlobal('useDashboardConfig', () => ({
  localConfig: ref({ services: [], bookmarks: [], widgets: [], settings: {} }),
  sectionOrder: ref([]),
  saveError: ref(''),
  editActive: ref(false),
  dirty: ref(false),
  enter: vi.fn(),
  exit: vi.fn(),
  pendingCount: ref(0),
  updateServiceGroup: vi.fn(),
  updateBookmarkGroup: vi.fn(),
  deleteServiceGroup: vi.fn(),
  deleteBookmarkGroup: vi.fn(),
  addServiceGroup: vi.fn(),
  addBookmarkGroup: vi.fn(),
  configLoaded: ref(true),
  save: vi.fn(),
  handleCancel: vi.fn(),
}))
vi.stubGlobal('useWidgetRefresh', () => ({ countdown: ref(0), forceRefresh: vi.fn() }))

import IndexPage from '~/pages/index.vue'

function mountPage(version = 'v1.2.3') {
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { version } }))
  return mount(IndexPage, {
    global: {
      stubs: {
        ...globalStubs,
        SectionList: true,
        EditToggle: true,
        ClockWidget: true,
        WeatherCard: true,
        CalendarPanel: true,
        WidgetCard: true,
        LoginModal: true,
        SetupTokenModal: true,
        ConfirmModal: true,
        DashboardBackground: true,
        Transition: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('index.vue version badge', () => {
  it('renders the version string from runtimeConfig', () => {
    const w = mountPage('v1.2.3')
    expect(w.text()).toContain('v1.2.3')
  })

  it('renders dev when no tag is available', () => {
    const w = mountPage('dev')
    expect(w.text()).toContain('dev')
  })

  it('version badge is fixed to bottom-left, high z-index, not interactive', () => {
    const w = mountPage('v1.0.0')
    const badge = w.find('.pointer-events-none')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('fixed')
    expect(badge.classes()).toContain('z-50')
    expect(badge.text().trim()).toBe('v1.0.0')
  })
})
