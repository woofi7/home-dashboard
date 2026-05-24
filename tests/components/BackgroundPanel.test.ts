// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

function makeUseFetch(provider = 'none') {
  return vi.fn(() => ({
    data: ref({ provider, color: '#0f1117', overlay: 40, blur: 'none', fadeSpeed: 'normal', position: 'center' }),
    refresh: vi.fn(),
  }))
}

vi.stubGlobal('useFetch', makeUseFetch())

import BackgroundPanel from '~/components/admin/BackgroundPanel.vue'

async function mountPanel(provider = 'none') {
  vi.stubGlobal('useFetch', makeUseFetch(provider))
  const App = defineComponent({
    components: { BackgroundPanel },
    template: '<Suspense><BackgroundPanel /></Suspense>',
  })
  const wrapper = mount(App, { global: { stubs: globalStubs } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('BackgroundPanel.vue', () => {
  describe('layout', () => {
    it('renders two panels side by side', async () => {
      const wrapper = await mountPanel()
      const panels = wrapper.findAll('.rounded-xl.border')
      expect(panels.length).toBe(2)
    })

    it('appearance panel is always visible regardless of provider', async () => {
      for (const provider of ['none', 'picsum', 'unsplash', 'url', 'upload']) {
        const wrapper = await mountPanel(provider)
        expect(wrapper.text()).toContain('Appearance')
      }
    })
  })

  describe('provider buttons', () => {
    it('renders all 7 provider buttons', async () => {
      const wrapper = await mountPanel()
      const labels = ['Basic color', 'Picsum', 'Unsplash', 'Pexels', 'Pixabay', 'Custom URL', 'Upload']
      for (const label of labels) {
        expect(wrapper.text()).toContain(label)
      }
    })

    it('highlights the active provider', async () => {
      const wrapper = await mountPanel('picsum')
      const active = wrapper.findAll('button').filter(b => b.classes().some(c => c.includes('text-accent')))
      expect(active.some(b => b.text() === 'Picsum')).toBe(true)
    })
  })

  describe('provider: none', () => {
    it('shows color picker', async () => {
      const wrapper = await mountPanel('none')
      expect(wrapper.find('input[type="color"]').exists()).toBe(true)
    })
  })

  describe('provider: picsum', () => {
    it('shows a link to picsum.photos', async () => {
      const wrapper = await mountPanel('picsum')
      const link = wrapper.findAll('a').find(a => a.attributes('href') === 'https://picsum.photos')
      expect(link).toBeTruthy()
    })
  })

  describe('provider: unsplash', () => {
    it('shows API key input', async () => {
      const wrapper = await mountPanel('unsplash')
      expect(wrapper.find('input[placeholder="Unsplash Client ID"]').exists()).toBe(true)
    })

    it('links to unsplash developers page', async () => {
      const wrapper = await mountPanel('unsplash')
      const link = wrapper.findAll('a').find(a => a.attributes('href') === 'https://unsplash.com/developers')
      expect(link).toBeTruthy()
    })

    it('shows numbered steps to get API key', async () => {
      const wrapper = await mountPanel('unsplash')
      const steps = wrapper.findAll('ol li')
      expect(steps.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('provider: pexels', () => {
    it('shows API key input', async () => {
      const wrapper = await mountPanel('pexels')
      expect(wrapper.find('input[placeholder="Pexels API Key"]').exists()).toBe(true)
    })

    it('links to pexels api page', async () => {
      const wrapper = await mountPanel('pexels')
      const link = wrapper.findAll('a').find(a => a.attributes('href') === 'https://www.pexels.com/api')
      expect(link).toBeTruthy()
    })
  })

  describe('provider: pixabay', () => {
    it('shows API key input', async () => {
      const wrapper = await mountPanel('pixabay')
      expect(wrapper.find('input[placeholder="Pixabay API Key"]').exists()).toBe(true)
    })

    it('links to pixabay api docs page', async () => {
      const wrapper = await mountPanel('pixabay')
      const link = wrapper.findAll('a').find(a => a.attributes('href') === 'https://pixabay.com/api/docs')
      expect(link).toBeTruthy()
    })
  })

  describe('provider: url', () => {
    it('shows URL input', async () => {
      const wrapper = await mountPanel('url')
      expect(wrapper.find('input[type="url"]').exists()).toBe(true)
    })
  })

  describe('provider: upload', () => {
    it('shows file input', async () => {
      const wrapper = await mountPanel('upload')
      expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    })

    it('hides preview when switching to upload with no prior upload', async () => {
      const wrapper = await mountPanel('none')
      const uploadBtn = wrapper.findAll('button').find(b => b.text() === 'Upload')
      await uploadBtn!.trigger('click')
      await flushPromises()
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('shows preview when saved provider is upload', async () => {
      const wrapper = await mountPanel('upload')
      const img = wrapper.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toContain('/api/background-file')
    })
  })

  describe('appearance panel', () => {
    it('shows position buttons', async () => {
      const wrapper = await mountPanel()
      for (const label of ['Center', 'Top', 'Bottom', 'Left', 'Right']) {
        expect(wrapper.text()).toContain(label)
      }
    })

    it('shows blur buttons', async () => {
      const wrapper = await mountPanel()
      for (const label of ['Light', 'Medium', 'Heavy']) {
        expect(wrapper.text()).toContain(label)
      }
    })

    it('shows fade-in speed buttons', async () => {
      const wrapper = await mountPanel()
      for (const label of ['Fast', 'Normal', 'Slow']) {
        expect(wrapper.text()).toContain(label)
      }
    })

    it('shows overlay slider', async () => {
      const wrapper = await mountPanel()
      expect(wrapper.find('input[type="range"]').exists()).toBe(true)
    })
  })

  describe('save', () => {
    it('calls $fetch POST on save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const wrapper = await mountPanel()
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      await saveBtn!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/background', expect.objectContaining({ method: 'POST' }))
    })

    it('shows Saved after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const wrapper = await mountPanel()
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      await saveBtn!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Saved')
    })

    it('shows error message on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
      const wrapper = await mountPanel()
      const saveBtn = wrapper.findAll('button').find(b => b.text() === 'Save')
      await saveBtn!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Unauthorized')
    })
  })
})
