// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

type Config = {
  clientId: string
  hasClientSecret: boolean
  hasRefreshToken: boolean
  showEvents: boolean
  showTasks: boolean
  daysAhead: number
  taskMode: string
}

let lastAdminRefresh = vi.fn()
let lastCalendarRefresh = vi.fn()

function makeUseFetch(config: Partial<Config> = {}, calendar: { tasksError?: string | null } = {}) {
  const adminData = ref<Config>({
    clientId:        config.clientId        ?? '',
    hasClientSecret: config.hasClientSecret ?? false,
    hasRefreshToken: config.hasRefreshToken ?? false,
    showEvents:      config.showEvents      ?? true,
    showTasks:       config.showTasks       ?? false,
    daysAhead:       config.daysAhead       ?? 2,
    taskMode:        config.taskMode        ?? 'all',
  })
  const calendarData = ref({ authorized: false, days: [], tasks: [], tasksError: calendar.tasksError ?? null })
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
  lastCalendarRefresh = vi.fn()
  return vi.fn((url: string) => {
    if (url === '/api/calendar') return { data: calendarData, refresh: lastCalendarRefresh }
    return { data: adminData, refresh }
  })
}

vi.stubGlobal('useFetch', makeUseFetch())
vi.stubGlobal('useRoute', vi.fn(() => ({ query: {} })))

import GoogleCalendarPanel from '~/components/admin/GoogleCalendarPanel.vue'

async function mountPanel(config: Partial<Config> = {}, query: Record<string, string> = {}, calendar: { tasksError?: string | null } = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(config, calendar))
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
      const w = await mountPanel({ clientId: 'id', hasClientSecret: true })
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
      const w = await mountPanel({ clientId: 'my-id', hasClientSecret: true })
      expect((w.find('input[placeholder="Client ID"]').element as HTMLInputElement).value).toBe('my-id')
    })

    it('Save button appears only when dirty', async () => {
      const w = await mountPanel({ clientId: 'x', hasClientSecret: true })
      expect(w.findAll('button').some(b => b.text() === 'Save' && !(b.element as HTMLButtonElement).disabled)).toBe(false)
      await w.find('input[placeholder="Client ID"]').setValue('changed')
      expect(w.findAll('button').some(b => b.text() === 'Save' && !(b.element as HTMLButtonElement).disabled)).toBe(true)
    })

    it('Cancel button appears when dirty and resets form', async () => {
      const w = await mountPanel({ clientId: 'saved' })
      await w.find('input[placeholder="Client ID"]').setValue('changed')
      const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel' && !(b.element as HTMLButtonElement).disabled)
      expect(cancelBtn).toBeTruthy()
      await cancelBtn!.trigger('click')
      expect((w.find('input[placeholder="Client ID"]').element as HTMLInputElement).value).toBe('saved')
    })

    it('calls POST /api/admin/calendar on save', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel()
      await w.find('input[placeholder="Client ID"]').setValue('new-id')
      await w.findAll('button').find(b => b.text() === 'Save' && !(b.element as HTMLButtonElement).disabled)!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/calendar', expect.objectContaining({ method: 'POST' }))
    })

    it('shows Saved feedback after successful save', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel()
      await w.find('input[placeholder="Client ID"]').setValue('new-id')
      await w.findAll('button').find(b => b.text() === 'Save' && !(b.element as HTMLButtonElement).disabled)!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Saved')
    })

    it('shows error on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Forbidden' } })
      const w = await mountPanel()
      await w.find('input[placeholder="Client ID"]').setValue('x')
      await w.findAll('button').find(b => b.text() === 'Save' && !(b.element as HTMLButtonElement).disabled)!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Forbidden')
    })
  })

  describe('connect step', () => {
    it('shows Connect button when credentials saved but not connected', async () => {
      const w = await mountPanel({ clientId: 'id', hasClientSecret: true, hasRefreshToken: false })
      expect(w.find('a[href="/api/auth/google"]').exists()).toBe(true)
      expect(w.find('a[href="/api/auth/google"]').text()).toContain('Connect Google Account')
    })

    it('collapses steps when connected', async () => {
      const w = await mountPanel({ clientId: 'id', hasClientSecret: true, hasRefreshToken: true })
      expect(w.text()).not.toContain('Create a Google Cloud project')
    })

    it('shows Connected to Google label when connected', async () => {
      const w = await mountPanel({ hasRefreshToken: true })
      expect(w.text()).toContain('Connected to Google')
    })

    it('expands steps when header is clicked', async () => {
      const w = await mountPanel({ hasRefreshToken: true })
      await w.find('button[class*="cursor-pointer w-full"]').trigger('click')
      expect(w.text()).toContain('Create a Google Cloud project')
    })

    it('shows Disconnect button when connected and steps expanded', async () => {
      const w = await mountPanel({ clientId: 'id', hasClientSecret: true, hasRefreshToken: true })
      await w.find('button[class*="cursor-pointer w-full"]').trigger('click')
      await w.vm.$nextTick()
      expect(w.findAll('button').some(b => b.text() === 'Disconnect account')).toBe(true)
    })

    it('calls disconnect endpoint on click', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ clientId: 'id', hasClientSecret: true, hasRefreshToken: true })
      await w.find('button[class*="cursor-pointer w-full"]').trigger('click')
      await w.vm.$nextTick()
      await w.findAll('button').find(b => b.text() === 'Disconnect account')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/calendar/disconnect', expect.objectContaining({ method: 'POST' }))
    })

    it('shows disconnect error on failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Network error' } })
      const w = await mountPanel({ clientId: 'id', hasClientSecret: true, hasRefreshToken: true })
      await w.find('button[class*="cursor-pointer w-full"]').trigger('click')
      await w.vm.$nextTick()
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

  describe('display settings', () => {
    it('renders the Display section', async () => {
      const w = await mountPanel()
      expect(w.text()).toContain('Display')
    })

    it('Show events toggle reflects saved state (on)', async () => {
      const w = await mountPanel({ showEvents: true })
      const switches = w.findAll('[role="switch"]')
      expect(switches[0].attributes('aria-checked')).toBe('true')
    })

    it('Show events toggle reflects saved state (off)', async () => {
      const w = await mountPanel({ showEvents: false })
      const switches = w.findAll('[role="switch"]')
      expect(switches[0].attributes('aria-checked')).toBe('false')
    })

    it('Show tasks toggle reflects saved state', async () => {
      const w = await mountPanel({ showTasks: true })
      const switches = w.findAll('[role="switch"]')
      expect(switches[1].attributes('aria-checked')).toBe('true')
    })

    it('toggling Show events makes display dirty', async () => {
      const w = await mountPanel({ showEvents: true })
      await w.findAll('[role="switch"]')[0].trigger('click')
      expect(w.text()).toContain('Save')
    })

    it('days ahead buttons render all options', async () => {
      const w = await mountPanel()
      for (const n of [1, 2, 3, 5, 7, 14, 30]) {
        expect(w.text()).toContain(String(n))
      }
    })

    it('clicking a days ahead option marks display dirty', async () => {
      const w = await mountPanel({ daysAhead: 2 })
      const dayBtns = w.findAll('button').filter(b => ['1', '3', '5', '7', '14', '30'].includes(b.text()))
      await dayBtns[0].trigger('click')
      expect(w.text()).toContain('Save')
    })

    it('Cancel display restores saved state', async () => {
      const w = await mountPanel({ daysAhead: 2 })
      const dayBtns = w.findAll('button').filter(b => ['7'].includes(b.text()))
      await dayBtns[0].trigger('click')
      const cancelBtn = w.findAll('button').find(b => b.text() === 'Cancel' && !(b.element as HTMLButtonElement).disabled)!
      await cancelBtn.trigger('click')
      expect(w.findAll('button').some(b => b.text() === 'Save' && !(b.element as HTMLButtonElement).disabled)).toBe(false)
    })

    it('saving display settings calls POST with display fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ showEvents: true, showTasks: false, daysAhead: 2 })
      await w.findAll('[role="switch"]')[1].trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      const call = mockFetch.mock.calls.find(c => c[0] === '/api/admin/calendar')!
      expect((call[1] as { body: Record<string, unknown> }).body).toMatchObject({ showTasks: true })
    })

    it('shows Saved after successful display save', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ daysAhead: 2 })
      const dayBtns = w.findAll('button').filter(b => b.text() === '7')
      await dayBtns[0].trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Saved')
    })

    it('refreshes the calendar preview after saving display settings', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ daysAhead: 2 })
      await w.findAll('button').filter(b => b.text() === '7')[0].trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(lastCalendarRefresh).toHaveBeenCalled()
    })

    it('shows the task mode selector only when tasks are enabled', async () => {
      const off = await mountPanel({ showTasks: false })
      expect(off.findAll('button').some(b => b.text() === 'Overdue')).toBe(false)
      const on = await mountPanel({ showTasks: true })
      expect(on.findAll('button').some(b => b.text() === 'Overdue')).toBe(true)
    })

    it('saves the chosen task mode', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ showTasks: true, taskMode: 'all' })
      await w.findAll('button').find(b => b.text() === 'Overdue')!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      const call = mockFetch.mock.calls.find(c => c[0] === '/api/admin/calendar')!
      expect((call[1] as { body: Record<string, unknown> }).body).toMatchObject({ taskMode: 'overdue' })
    })

    it('switches back to everything mode', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPanel({ showTasks: true, taskMode: 'overdue' })
      await w.findAll('button').find(b => b.text() === 'Everything')!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      const call = mockFetch.mock.calls.find(c => c[0] === '/api/admin/calendar')!
      expect((call[1] as { body: Record<string, unknown> }).body).toMatchObject({ taskMode: 'all' })
    })
  })

  describe('tasks error warning', () => {
    it('shows the tasks error when tasks are enabled and the fetch failed', async () => {
      const w = await mountPanel({ showTasks: true }, {}, { tasksError: 'The Google Tasks API is not enabled for your Google Cloud project.' })
      expect(w.text()).toContain('The Google Tasks API is not enabled')
    })

    it('hides the warning when tasks are disabled', async () => {
      const w = await mountPanel({ showTasks: false }, {}, { tasksError: 'Some error' })
      expect(w.text()).not.toContain('Some error')
    })

    it('hides the warning when there is no tasks error', async () => {
      const w = await mountPanel({ showTasks: true }, {}, { tasksError: null })
      expect(w.find('.border-warning\\/30').exists()).toBe(false)
    })

    it('offers a link to enable the Tasks API in the setup steps', async () => {
      const w = await mountPanel()
      const link = w.findAll('a').find(a => a.text().includes('Enable Tasks API'))
      expect(link?.attributes('href')).toContain('tasks.googleapis.com')
    })
  })
})
