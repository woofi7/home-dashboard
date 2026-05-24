// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { globalStubs } from './helpers'

import BackgroundProviderConfig from '~/components/admin/BackgroundProviderConfig.vue'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

const DEFAULT_STUBS = {
  ...globalStubs,
  OptionPicker: {
    template: '<div class="option-picker"><button v-for="opt in options" :key="opt.value" :class="{ active: modelValue === opt.value }" @click="$emit(\'update:modelValue\', opt.value)">{{ opt.label }}</button></div>',
    props: ['modelValue', 'options', 'size'],
    emits: ['update:modelValue'],
  },
}

function baseForm(provider = 'none') {
  return {
    provider,
    color: '#0f1117',
    unsplashApiKey: '',
    pexelsApiKey: '',
    pixabayApiKey: '',
    query: '',
    url: '',
  }
}

function mountConfig(provider = 'none', savedProvider?: string) {
  return mount(BackgroundProviderConfig, {
    props: { modelValue: baseForm(provider), savedProvider },
    global: { stubs: DEFAULT_STUBS },
  })
}

beforeEach(() => mockFetch.mockReset())

describe('BackgroundProviderConfig.vue', () => {
  describe('provider selector', () => {
    it('renders all 7 provider options', () => {
      const w = mountConfig()
      for (const label of ['Basic color', 'Picsum', 'Unsplash', 'Pexels', 'Pixabay', 'Custom URL', 'Upload']) {
        expect(w.text()).toContain(label)
      }
    })

    it('emits update:modelValue with new provider on click', async () => {
      const w = mountConfig('none')
      await w.findAll('button').find(b => b.text() === 'Picsum')!.trigger('click')
      const emitted = w.emitted('update:modelValue') as [{ provider: string }][]
      expect(emitted?.[0]?.[0]?.provider).toBe('picsum')
    })
  })

  describe('provider: none', () => {
    it('shows color picker', () => {
      const w = mountConfig('none')
      expect(w.find('input[type="color"]').exists()).toBe(true)
    })

    it('emits color change', async () => {
      const w = mountConfig('none')
      const input = w.find('input[type="color"]')
      await input.setValue('#ff0000')
      const emitted = w.emitted('update:modelValue') as [{ color: string }][]
      expect(emitted?.[0]?.[0]?.color).toBe('#ff0000')
    })
  })

  describe('provider: picsum', () => {
    it('shows picsum description with link', () => {
      const w = mountConfig('picsum')
      expect(w.find('a[href="https://picsum.photos"]').exists()).toBe(true)
    })

    it('does not show query input', () => {
      const w = mountConfig('picsum')
      expect(w.find('input[placeholder="nature landscape"]').exists()).toBe(false)
    })
  })

  describe('provider: unsplash', () => {
    it('shows API key input', () => {
      const w = mountConfig('unsplash')
      expect(w.find('input[placeholder="Unsplash Client ID"]').exists()).toBe(true)
    })

    it('links to unsplash developers page', () => {
      const w = mountConfig('unsplash')
      expect(w.find('a[href="https://unsplash.com/developers"]').exists()).toBe(true)
    })

    it('shows numbered setup steps', () => {
      const w = mountConfig('unsplash')
      expect(w.findAll('ol li').length).toBeGreaterThanOrEqual(5)
    })

    it('shows query input', () => {
      const w = mountConfig('unsplash')
      expect(w.find('input[placeholder="nature landscape"]').exists()).toBe(true)
    })

    it('emits unsplashApiKey change', async () => {
      const w = mountConfig('unsplash')
      const input = w.find('input[placeholder="Unsplash Client ID"]')
      await input.setValue('my-key')
      const emitted = w.emitted('update:modelValue') as [{ unsplashApiKey: string }][]
      expect(emitted?.[0]?.[0]?.unsplashApiKey).toBe('my-key')
    })
  })

  describe('provider: pexels', () => {
    it('shows API key input', () => {
      const w = mountConfig('pexels')
      expect(w.find('input[placeholder="Pexels API Key"]').exists()).toBe(true)
    })

    it('links to pexels api page', () => {
      const w = mountConfig('pexels')
      expect(w.find('a[href="https://www.pexels.com/api"]').exists()).toBe(true)
    })

    it('shows query input', () => {
      const w = mountConfig('pexels')
      expect(w.find('input[placeholder="nature landscape"]').exists()).toBe(true)
    })
  })

  describe('provider: pixabay', () => {
    it('shows API key input', () => {
      const w = mountConfig('pixabay')
      expect(w.find('input[placeholder="Pixabay API Key"]').exists()).toBe(true)
    })

    it('links to pixabay api docs', () => {
      const w = mountConfig('pixabay')
      expect(w.find('a[href="https://pixabay.com/api/docs"]').exists()).toBe(true)
    })

    it('shows query input', () => {
      const w = mountConfig('pixabay')
      expect(w.find('input[placeholder="nature landscape"]').exists()).toBe(true)
    })
  })

  describe('provider: url', () => {
    it('shows url input', () => {
      const w = mountConfig('url')
      expect(w.find('input[type="url"]').exists()).toBe(true)
    })

    it('emits url change', async () => {
      const w = mountConfig('url')
      const input = w.find('input[type="url"]')
      await input.setValue('https://example.com/bg.jpg')
      const emitted = w.emitted('update:modelValue') as [{ url: string }][]
      expect(emitted?.[0]?.[0]?.url).toBe('https://example.com/bg.jpg')
    })
  })

  describe('provider: upload', () => {
    it('shows file input', () => {
      const w = mountConfig('upload')
      expect(w.find('input[type="file"]').exists()).toBe(true)
    })

    it('shows preview when savedProvider is upload', () => {
      const w = mountConfig('upload', 'upload')
      expect(w.find('img').exists()).toBe(true)
    })

    it('hides preview when no prior upload and uploadedKey is 0', () => {
      const w = mountConfig('upload', 'none')
      expect(w.find('img').exists()).toBe(false)
    })

    it('shows uploading state during upload', async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}))
      const w = mountConfig('upload')
      const file = new File(['x'], 'bg.jpg', { type: 'image/jpeg' })
      const input = w.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')
      expect(w.text()).toContain('Uploading...')
    })

    it('shows error when upload fails', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Too large' } })
      const w = mountConfig('upload')
      const file = new File(['x'], 'bg.jpg', { type: 'image/jpeg' })
      const input = w.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')
      await flushPromises()
      expect(w.text()).toContain('Too large')
    })

    it('emits provider upload and shows preview after successful upload', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = mountConfig('upload')
      const file = new File(['x'], 'bg.jpg', { type: 'image/jpeg' })
      const input = w.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')
      await flushPromises()
      const emitted = w.emitted('update:modelValue') as [{ provider: string }][]
      expect(emitted?.[0]?.[0]?.provider).toBe('upload')
      expect(w.find('img').exists()).toBe(true)
    })
  })
})
