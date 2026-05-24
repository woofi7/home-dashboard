// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

function makeUseFetch(initialProvider = 'none') {
  const data = ref<Record<string, unknown>>({
    provider: initialProvider, color: '#0f1117', overlay: 40,
    blur: 'none', fadeSpeed: 'normal', position: 'center',
  })
  const refresh = vi.fn().mockImplementation(() => {
    const lastPost = [...mockFetch.mock.calls].reverse()
      .find((c) => (c[1] as { method?: string })?.method === 'POST')
    if (lastPost) {
      data.value = (lastPost[1] as { body: Record<string, unknown> }).body
    }
  })
  return vi.fn(() => ({ data, refresh }))
}

vi.stubGlobal('useFetch', makeUseFetch())

import BackgroundPanel from '~/components/admin/BackgroundPanel.vue'

const PROVIDER_STUB = {
  template: '<div class="provider-stub"><button @click="$emit(\'update:modelValue\', { ...modelValue, provider: \'picsum\' })">switch-provider</button></div>',
  props: ['modelValue', 'savedProvider'],
  emits: ['update:modelValue'],
}

const APPEARANCE_STUB = {
  template: '<div class="appearance-stub" />',
  props: ['modelValue'],
  emits: ['update:modelValue'],
}

async function mountPanel(provider = 'none') {
  vi.stubGlobal('useFetch', makeUseFetch(provider))
  const App = defineComponent({
    components: { BackgroundPanel },
    template: '<Suspense><BackgroundPanel /></Suspense>',
  })
  const wrapper = mount(App, {
    global: {
      stubs: {
        ...globalStubs,
        BackgroundProviderConfig: PROVIDER_STUB,
        BackgroundAppearance: APPEARANCE_STUB,
      },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('BackgroundPanel.vue', () => {
  describe('layout', () => {
    it('renders provider and appearance panels', async () => {
      const wrapper = await mountPanel()
      expect(wrapper.find('.provider-stub').exists()).toBe(true)
      expect(wrapper.find('.appearance-stub').exists()).toBe(true)
    })

    it('passes savedProvider to the provider config', async () => {
      const wrapper = await mountPanel('upload')
      expect(wrapper.find('.provider-stub').exists()).toBe(true)
    })
  })

  describe('dirty state', () => {
    it('Save and Cancel are disabled when form is not dirty', async () => {
      const wrapper = await mountPanel()
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel')
      expect(saveBtn!.attributes('disabled')).toBeDefined()
      expect(cancelBtn!.attributes('disabled')).toBeDefined()
    })

    it('shows Unsaved changes when form is dirty', async () => {
      const wrapper = await mountPanel('none')
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(wrapper.text()).toContain('Unsaved changes')
    })

    it('enables Save and Cancel when form is dirty', async () => {
      const wrapper = await mountPanel('none')
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel')
      expect(saveBtn!.attributes('disabled')).toBeUndefined()
      expect(cancelBtn!.attributes('disabled')).toBeUndefined()
    })

    it('Cancel resets form to saved state', async () => {
      const wrapper = await mountPanel('none')
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(wrapper.text()).toContain('Unsaved changes')
      await wrapper.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(wrapper.text()).not.toContain('Unsaved changes')
    })
  })

  describe('save', () => {
    async function makeDirty(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
    }

    it('calls $fetch POST on save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const wrapper = await mountPanel()
      await makeDirty(wrapper)
      await wrapper.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/background', expect.objectContaining({ method: 'POST' }))
    })

    it('shows Saved after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const wrapper = await mountPanel()
      await makeDirty(wrapper)
      await wrapper.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Saved')
    })

    it('shows error message on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
      const wrapper = await mountPanel()
      await makeDirty(wrapper)
      await wrapper.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Unauthorized')
    })
  })
})
