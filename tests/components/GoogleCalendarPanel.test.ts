// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

type Config = { clientId: string; clientSecret: string; hasRefreshToken: boolean }

let lastAdminRefresh = vi.fn()

function makeUseFetch(config: Partial<Config> = {}) {
  const adminData = ref<Config>({
    clientId:        config.clientId        ?? '',
    clientSecret:    config.clientSecret    ?? '',
    hasRefreshToken: config.hasRefreshToken ?? false,
  })
  const calendarData = ref({ authorized: false, todayTimed: [], todayAllDay: [], tomorrow: [] })
  const refresh = vi.fn().mockImplementation(() => {
    const last = [...mockFetch.mock.calls].reverse()
      .find((c) => (c[1] as { method?: string })?.method === 'POST')
    if (last?.[0] === '/api/admin/calendar/disconnect') {
      adminData.value = { ...adminData.value, hasRefreshToken: false }
    } else if (last?.[0] === '/api/admin/calendar') {
      const body = (last[1] as { body: Partial<Config> }).body
      adminData.value = { ...adminData.value, ...body }
    }
  })
  lastAdminRefresh = refresh
  return vi.fn((url: string) => {
    if (url === '/api/calendar') return { data: calendarData, refresh: vi.fn() }
    return { data: adminData, refresh }
  })
}

vi.stubGlobal('useFetch', makeUseFetch())
vi.stubGlobal('useRoute', vi.fn(() => ({ query: {} })))

import GoogleCalendarPanel from '~/components/admin/GoogleCalendarPanel.vue'

async function mountPanel(config: Partial<Config> = {}, query: Record<string, string> = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(config))
  vi.stubGlobal('useRoute', vi.fn(() => ({ query })))
  const App = defineComponent({
    components: { GoogleCalendarPanel },
    template: '<Suspense><GoogleCalendarPanel /></Suspense>',
  })
  const wrapper = mount(App, {
    global: {
      stubs: {
        ...globalStubs,
        CalendarPanel: { template: '<div class="calendar-panel-stub" />', props: ['calendar'] },
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => mockFetch.mockReset())

describe('GoogleCalendarPanel.vue', () => {
  describe('success banner', () => {
    it('shows success banner when connected=1 and has refresh token', async () => {
      const w = await mountPanel({ hasRefreshToken: true }, { connected: '1' })
      expect(w.text()).toContain('Google account connected successfully')
    })

    it('does not show success banner without connected=1', async () => {
      const w = await mountPanel({ hasRefreshToken: true })
      expect(w.text()).not.toContain('Google account connected successfully')
    })

    it('does not show success banner when connected=1 but no token', async () => {
      const w = await mountPanel({ hasRefreshToken: false }, { connected: '1' })
      expect(w.text()).not.toContain('Google account connected successfully')
    })

    it('refreshes config on mount when connected=1', async () => {
      await mountPanel({ hasRefreshToken: false }, { connected: '1' })
      expect(lastAdminRefresh).toHaveBeenCalled()
    })

    it('does not refresh on mount when connected param is absent', async () => {
      await mountPanel({ hasRefreshToken: false })
      expect(lastAdminRefresh).not.toHaveBeenCalled()
    })
  })

  describe('setup steps', () => {
    it('renders all 4 steps', async () => {
      const w = await mountPanel()
      const steps = ['Create a Google Cloud project', 'Create OAuth 2.0 credentials', 'Enter your credentials', 'Connect your Google account']
      for (const step of steps) {
        expect(w.text()).toContain(step)
      }
    })

    it('links to Google Cloud Console', async () => {
      const w = await mountPanel()
      expect(w.find('a[href="https://console.cloud.google.com"]').exists()).toBe(true)
    })

    it('links to enable Calendar API', async () => {
      const w = await mountPanel()
      const link = w.findAll('a').find(a => a.attributes('href')?.includes('calendar-json.googleapis.com'))
      expect(link).toBeTruthy()
    })

    it('links to credentials page', async () => {
      const w = await mountPanel()
      expect(w.find('a[href="https://console.cloud.google.com/apis/credentials"]').exists()).toBe(true)
    })

    it('step 3 shows checkmark icon when credentials are saved', async () => {
      const w = await mountPanel({ clientId: 'id', clientSecret: 'sec' })
      const checkmarks = w.findAll('[data-icon="check"]')
      expect(checkmarks.length).toBeGreaterThan(0)
    })

    it('step 4 is locked when no credentials saved', async () => {
      const w = await mountPanel()
      expect(w.text()).toContain('Save your credentials in step 3 to unlock this step')
    })
  })

  describe('credentials form', () => {
    it('renders Client ID and Client Secret inputs', async () => {
      const w = await mountPanel()
      expect(w.find('input[placeholder="Client ID"]').exists()).toBe(true)
      expect(w.find('input[placeholder="Client Secret"]').exists()).toBe(true)
    })

    it('populates inputs with current config', async () => {
      const w = await mountPanel({ clientId: 'my-id', clientSecret: 'my-secret' })
      expect((w.find('input[placeholder="Client ID"]').element as HTMLInputElement).value).toBe('my-id')
    })

    it('Save button appears only when dirty', async () => {
      const w = await mountPanel({ clientId: 'x', clientSecret: 'y' })
      expect(w.findAll('button').some(b => b.text() === 'Save')).toBe(false)
      await w.find('input[placeholder="Client ID"]').setValue('changed')
      expect(w.findAll('button').some(b => b.text() === 'Save')).toBe(true)
    })

    it('Cancel button appears when dirty and resets form', async () => {
      const w = await mountPanel({ clientId: 'saved' })
      await w.find('input[placeholder="Client ID"]').setValue('changed')
      const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel')
      expect(cancelBtn).toBeTruthy()
      await cancelBtn!.trigger('click')
      expect((w.find('input[placeholder="Client ID"]').element as HTMLInputElement).value).toBe('saved')
    })

    it('calls POST /api/admin/calendar on save', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel()
      await w.find('input[placeholder="Client ID"]').setValue('new-id')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/calendar', expect.objectContaining({ method: 'POST' }))
    })

    it('shows Saved feedback after successful save', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel()
      await w.find('input[placeholder="Client ID"]').setValue('new-id')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Saved')
    })

    it('shows error on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Forbidden' } })
      const w = await mountPanel()
      await w.find('input[placeholder="Client ID"]').setValue('x')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Forbidden')
    })
  })

  describe('connect step', () => {
    it('shows Connect button when credentials saved but not connected', async () => {
      const w = await mountPanel({ clientId: 'id', clientSecret: 'sec', hasRefreshToken: false })
      expect(w.find('a[href="/api/auth/google"]').exists()).toBe(true)
      expect(w.find('a[href="/api/auth/google"]').text()).toContain('Connect Google Account')
    })

    it('shows Disconnect button when connected', async () => {
      const w = await mountPanel({ clientId: 'id', clientSecret: 'sec', hasRefreshToken: true })
      expect(w.findAll('button').some(b => b.text() === 'Disconnect account')).toBe(true)
    })

    it('calls disconnect endpoint on click', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ clientId: 'id', clientSecret: 'sec', hasRefreshToken: true })
      await w.findAll('button').find(b => b.text() === 'Disconnect account')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/calendar/disconnect', expect.objectContaining({ method: 'POST' }))
    })

    it('shows disconnect error on failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Network error' } })
      const w = await mountPanel({ clientId: 'id', clientSecret: 'sec', hasRefreshToken: true })
      await w.findAll('button').find(b => b.text() === 'Disconnect account')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Network error')
    })
  })

  describe('preview', () => {
    it('renders the Preview section', async () => {
      const w = await mountPanel()
      expect(w.text()).toContain('Preview')
    })

    it('renders the CalendarPanel widget in the preview', async () => {
      const w = await mountPanel()
      expect(w.find('.calendar-panel-stub').exists()).toBe(true)
    })
  })
})
