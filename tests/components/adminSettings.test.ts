// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

function makeUseFetch(overrides: { title?: string } = {}) {
  const data = ref({ title: overrides.title ?? 'My Dashboard' })
  const refresh = vi.fn().mockImplementation(() => {
    const lastPost = [...mockFetch.mock.calls].reverse()
      .find((c) => (c[1] as { method?: string })?.method === 'POST')
    if (lastPost)
      data.value = (lastPost[1] as { body: Record<string, unknown> }).body as { title: string }
  })
  return vi.fn(() => ({ data, refresh }))
}

vi.stubGlobal('useFetch', makeUseFetch())

import { defineComponent } from 'vue'
import AdminSettings from '~/pages/admin/settings.vue'

async function mountPage(overrides: { title?: string } = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(overrides))
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
})
