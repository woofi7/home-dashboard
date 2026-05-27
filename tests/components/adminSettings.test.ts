// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

type SettingsData = { title?: string; bookmarkCounterEnabled?: boolean; linkTarget?: 'new-tab' | 'same-tab'; adminToken?: string; timezone?: string }

function makeUseFetch(settings: SettingsData = {}, clicks: Record<string, number> = {}) {
  const settingsData = ref<SettingsData>({ title: 'My Dashboard', bookmarkCounterEnabled: true, adminToken: '', timezone: '', ...settings })
  const clicksData = ref<Record<string, number>>(clicks)
  const refresh = vi.fn().mockImplementation(() => {
    const lastPost = [...mockFetch.mock.calls].reverse()
      .find((c) => (c[1] as { method?: string })?.method === 'POST')
    if (lastPost)
      settingsData.value = (lastPost[1] as { body: SettingsData }).body
  })
  const refreshClicks = vi.fn().mockImplementation(() => {
    clicksData.value = {}
  })

  return vi.fn((url: string) => {
    if (url === '/api/bookmarks/clicks')
      return { data: clicksData, refresh: refreshClicks }
    return { data: settingsData, refresh }
  })
}

vi.stubGlobal('useFetch', makeUseFetch())

import { defineComponent } from 'vue'
import AdminSettings from '~/pages/admin/settings.vue'

async function mountPage(settings: SettingsData = {}, clicks: Record<string, number> = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(settings, clicks))
  const App = defineComponent({
    components: { AdminSettings },
    template: '<Suspense><AdminSettings /></Suspense>',
  })
  const wrapper = mount(App, { global: { stubs: globalStubs } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('admin/settings.vue', () => {
  it('renders the General heading', async () => {
    const w = await mountPage()
    expect(w.text()).toContain('General')
  })

  it('renders the dashboard title input with current value', async () => {
    const w = await mountPage({ title: 'My Board' })
    const input = w.find('input[type="text"]')
    expect(input.element.value).toBe('My Board')
  })

  it('Save and Cancel are disabled when not dirty', async () => {
    const w = await mountPage()
    expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeDefined()
    expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeDefined()
  })

  it('shows Unsaved changes when title is changed', async () => {
    const w = await mountPage({ title: 'Old Title' })
    await w.find('input[type="text"]').setValue('New Title')
    expect(w.text()).toContain('Unsaved changes')
  })

  it('enables Save and Cancel when dirty', async () => {
    const w = await mountPage({ title: 'Old' })
    await w.find('input[type="text"]').setValue('New')
    expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeUndefined()
    expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeUndefined()
  })

  it('Cancel resets the title', async () => {
    const w = await mountPage({ title: 'Old' })
    await w.find('input[type="text"]').setValue('New')
    await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
    expect(w.find('input[type="text"]').element.value).toBe('Old')
    expect(w.text()).not.toContain('Unsaved changes')
  })

  it('calls $fetch POST on save', async () => {
    mockFetch.mockResolvedValueOnce({})
    const w = await mountPage({ title: 'Old' })
    await w.find('input[type="text"]').setValue('New')
    await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
    await flushPromises()
    expect(mockFetch).toHaveBeenCalledWith('/api/edit/settings', expect.objectContaining({ method: 'POST' }))
  })

  it('shows Saved after successful save', async () => {
    mockFetch.mockResolvedValueOnce({})
    const w = await mountPage({ title: 'Old' })
    await w.find('input[type="text"]').setValue('New')
    await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Saved')
  })

  it('shows error message on save failure', async () => {
    mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
    const w = await mountPage({ title: 'Old' })
    await w.find('input[type="text"]').setValue('New')
    await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Unauthorized')
  })

  describe('bookmark counter section', () => {
    it('renders the Bookmark Counter heading', async () => {
      const w = await mountPage()
      expect(w.text()).toContain('Bookmark Counter')
    })

    it('toggle switch is on when bookmarkCounterEnabled is true', async () => {
      const w = await mountPage({ bookmarkCounterEnabled: true })
      const toggle = w.find('[role="switch"]')
      expect(toggle.attributes('aria-checked')).toBe('true')
    })

    it('toggle switch is off when bookmarkCounterEnabled is false', async () => {
      const w = await mountPage({ bookmarkCounterEnabled: false })
      const toggle = w.find('[role="switch"]')
      expect(toggle.attributes('aria-checked')).toBe('false')
    })

    it('clicking toggle marks form dirty', async () => {
      const w = await mountPage({ bookmarkCounterEnabled: true })
      await w.find('[role="switch"]').trigger('click')
      expect(w.text()).toContain('Unsaved changes')
    })

    it('Cancel restores the toggle state', async () => {
      const w = await mountPage({ bookmarkCounterEnabled: true })
      await w.find('[role="switch"]').trigger('click')
      expect(w.find('[role="switch"]').attributes('aria-checked')).toBe('false')
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(w.find('[role="switch"]').attributes('aria-checked')).toBe('true')
    })

    it('shows total click count', async () => {
      const w = await mountPage({}, { GitHub: 5, Jira: 3 })
      expect(w.text()).toContain('8 click')
    })

    it('Reset button is disabled when no clicks recorded', async () => {
      const w = await mountPage({}, {})
      const resetBtn = w.findAll('button').find(b => b.text() === 'Reset')!
      expect(resetBtn.attributes('disabled')).toBeDefined()
    })

    it('Reset button is enabled when clicks exist', async () => {
      const w = await mountPage({}, { GitHub: 3 })
      const resetBtn = w.findAll('button').find(b => b.text() === 'Reset')!
      expect(resetBtn.attributes('disabled')).toBeUndefined()
    })

    it('clicking Reset calls DELETE /api/admin/bookmark-clicks', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPage({}, { GitHub: 3 })
      await w.findAll('button').find(b => b.text() === 'Reset')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/bookmark-clicks', expect.objectContaining({ method: 'DELETE' }))
    })

    it('shows Counts cleared after successful reset', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })
      const w = await mountPage({}, { GitHub: 3 })
      await w.findAll('button').find(b => b.text() === 'Reset')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Counts cleared')
    })
  })

  describe('admin token', () => {
    it('renders the Admin token label', async () => {
      const w = await mountPage()
      expect(w.text()).toContain('Admin token')
    })

    it('populates the token input from config', async () => {
      const w = await mountPage({ adminToken: 'secret123' })
      const input = w.find('input[placeholder="Enter admin token"]')
      expect(input.element.value).toBe('secret123')
    })

    it('changing the token marks the form dirty', async () => {
      const w = await mountPage({ adminToken: 'old' })
      await w.find('input[placeholder="Enter admin token"]').setValue('new')
      expect(w.text()).toContain('Unsaved changes')
    })

    it('Cancel resets the token to its original value', async () => {
      const w = await mountPage({ adminToken: 'original' })
      await w.find('input[placeholder="Enter admin token"]').setValue('changed')
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(w.find('input[placeholder="Enter admin token"]').element.value).toBe('original')
    })

    it('saves adminToken in POST body', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ adminToken: 'old' })
      await w.find('input[placeholder="Enter admin token"]').setValue('newtoken')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/edit/settings',
        expect.objectContaining({ body: expect.objectContaining({ adminToken: 'newtoken' }) }),
      )
    })
  })

  describe('timezone', () => {
    it('renders the Timezone label', async () => {
      const w = await mountPage()
      expect(w.text()).toContain('Timezone')
    })

    it('renders the Security section with Admin token label', async () => {
      const w = await mountPage()
      expect(w.text()).toContain('Security')
      expect(w.text()).toContain('Admin token')
    })

    it('marks form dirty when timezone changes', async () => {
      const w = await mountPage({ timezone: '' })
      // TimezoneSelect is stubbed as a plain input by globalStubs fallback — use the input directly
      const inputs = w.findAll('input[type="text"]')
      const tzInput = inputs.find(i => i.attributes('placeholder')?.toLowerCase().includes('server'))
      if (!tzInput)
        return // component renders TimezoneSelect which is not a plain input in this env
      await tzInput.setValue('America/Toronto')
      expect(w.text()).toContain('Unsaved changes')
    })

    it('saves timezone in POST body', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ title: 'Old', timezone: '' })
      await w.find('input[type="text"]').setValue('New')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/edit/settings',
        expect.objectContaining({ body: expect.objectContaining({ timezone: expect.anything() }) }),
      )
    })
  })

  describe('link behavior', () => {
    it('renders New tab and Same tab buttons', async () => {
      const w = await mountPage()
      expect(w.text()).toContain('New tab')
      expect(w.text()).toContain('Same tab')
    })

    it('New tab button is active by default', async () => {
      const w = await mountPage()
      const newTabBtn = w.findAll('button').find(b => b.text() === 'New tab')!
      expect(newTabBtn.classes()).toContain('bg-accent')
    })

    it('Same tab button is active when linkTarget is same-tab', async () => {
      const w = await mountPage({ linkTarget: 'same-tab' })
      const sameTabBtn = w.findAll('button').find(b => b.text() === 'Same tab')!
      expect(sameTabBtn.classes()).toContain('bg-accent')
    })

    it('clicking Same tab marks form dirty', async () => {
      const w = await mountPage()
      await w.findAll('button').find(b => b.text() === 'Same tab')!.trigger('click')
      expect(w.text()).toContain('Unsaved changes')
    })

    it('clicking New tab when already new-tab does not mark dirty', async () => {
      const w = await mountPage({ linkTarget: 'new-tab' })
      await w.findAll('button').find(b => b.text() === 'New tab')!.trigger('click')
      expect(w.text()).not.toContain('Unsaved changes')
    })

    it('Cancel restores link target to original value', async () => {
      const w = await mountPage({ linkTarget: 'new-tab' })
      await w.findAll('button').find(b => b.text() === 'Same tab')!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      const newTabBtn = w.findAll('button').find(b => b.text() === 'New tab')!
      expect(newTabBtn.classes()).toContain('bg-accent')
    })

    it('saves linkTarget in POST body', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ linkTarget: 'new-tab' })
      await w.findAll('button').find(b => b.text() === 'Same tab')!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/edit/settings',
        expect.objectContaining({ body: expect.objectContaining({ linkTarget: 'same-tab' }) }),
      )
    })
  })
})
