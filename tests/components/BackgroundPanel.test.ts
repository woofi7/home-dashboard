// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

type Config = {
  provider?: string; color?: string; overlay?: number; blur?: string
  fadeSpeed?: string; position?: string; sectionStyle?: string; cardStyle?: string; url?: string
}

function makeUseFetch(config: Config = {}) {
  const data = ref<Record<string, unknown>>({
    provider: 'none', color: '#0f1117', overlay: 40,
    blur: 'none', fadeSpeed: 'normal', position: 'center',
    sectionStyle: 'glass', cardStyle: 'dark',
    ...config,
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
  template: `<div class="appearance-stub">
    <button @click="$emit('update:modelValue', { ...modelValue, sectionStyle: 'darker' })">change-section</button>
    <button @click="$emit('update:modelValue', { ...modelValue, cardStyle: 'glass' })">change-card</button>
  </div>`,
  props: ['modelValue'],
  emits: ['update:modelValue'],
}

async function mountPanel(config: Config = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(config))
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

// Helpers to find preview layer elements by their distinguishing style content
function findByStyle(wrapper: ReturnType<typeof mount>, keyword: string) {
  return wrapper.findAll('div').find(el => (el.attributes('style') ?? '').includes(keyword))
}

const imageLayer  = (w: ReturnType<typeof mount>) => findByStyle(w, 'url(')
const overlayLayer = (w: ReturnType<typeof mount>) => w.findAll('div').find(el =>
  (el.attributes('style') ?? '').includes('rgba(0, 0, 0') &&
  (el.attributes('class') ?? '').includes('inset-0')
)
const solidLayer   = (w: ReturnType<typeof mount>) => findByStyle(w, 'linear-gradient')

function findPreviewSection(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('div').find(el => {
    const cls = el.attributes('class') ?? ''
    return cls.includes('rounded-xl') && cls.includes('border-white/10') && cls.includes('overflow-hidden')
  })
}

function findPreviewCard(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('div').find(el => {
    const cls = el.attributes('class') ?? ''
    return cls.includes('rounded-lg') && cls.includes('border-white/10')
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('BackgroundPanel.vue', () => {
  describe('layout', () => {
    it('renders provider and appearance panels', async () => {
      const w = await mountPanel()
      expect(w.find('.provider-stub').exists()).toBe(true)
      expect(w.find('.appearance-stub').exists()).toBe(true)
    })

    it('renders Background section heading', async () => {
      expect((await mountPanel()).text()).toContain('Background')
    })

    it('renders Appearance section heading', async () => {
      expect((await mountPanel()).text()).toContain('Appearance')
    })

    it('renders the Preview section', async () => {
      expect((await mountPanel()).text()).toContain('Preview')
    })

    it('passes savedProvider to the provider config', async () => {
      const w = await mountPanel({ provider: 'upload' })
      expect(w.find('.provider-stub').exists()).toBe(true)
    })
  })

  describe('dirty state', () => {
    it('Save and Cancel are disabled when form is not dirty', async () => {
      const w = await mountPanel()
      expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeDefined()
      expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeDefined()
    })

    it('shows Unsaved changes when form is dirty', async () => {
      const w = await mountPanel()
      await w.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(w.text()).toContain('Unsaved changes')
    })

    it('enables Save and Cancel when form is dirty', async () => {
      const w = await mountPanel()
      await w.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeUndefined()
      expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeUndefined()
    })

    it('Cancel resets form to saved state', async () => {
      const w = await mountPanel()
      await w.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(w.text()).toContain('Unsaved changes')
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(w.text()).not.toContain('Unsaved changes')
    })
  })

  describe('save', () => {
    async function makeDirty(w: Awaited<ReturnType<typeof mountPanel>>) {
      await w.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
    }

    it('calls $fetch POST on save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPanel()
      await makeDirty(w)
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/background', expect.objectContaining({ method: 'POST' }))
    })

    it('shows Saved after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPanel()
      await makeDirty(w)
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Saved')
    })

    it('shows error message on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
      const w = await mountPanel()
      await makeDirty(w)
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Unauthorized')
    })
  })

  describe('preview', () => {
    describe('background layers', () => {
      it('shows image layer for image provider', async () => {
        const w = await mountPanel({ provider: 'picsum' })
        expect(imageLayer(w)).toBeTruthy()
      })

      it('shows overlay layer for image provider', async () => {
        const w = await mountPanel({ provider: 'picsum' })
        expect(overlayLayer(w)).toBeTruthy()
      })

      it('shows no image layer when provider is none', async () => {
        const w = await mountPanel({ provider: 'none' })
        expect(imageLayer(w)).toBeFalsy()
      })

      it('shows no overlay layer when provider is none', async () => {
        const w = await mountPanel({ provider: 'none' })
        expect(overlayLayer(w)).toBeFalsy()
      })

      it('shows solid color layer when provider is none', async () => {
        const w = await mountPanel({ provider: 'none' })
        expect(solidLayer(w)).toBeTruthy()
      })

      it('shows no solid layer for image provider', async () => {
        const w = await mountPanel({ provider: 'picsum' })
        expect(solidLayer(w)).toBeFalsy()
      })
    })

    describe('image URL', () => {
      it('uses picsum for picsum provider', async () => {
        const w = await mountPanel({ provider: 'picsum' })
        expect(imageLayer(w)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses picsum placeholder for unsplash provider', async () => {
        const w = await mountPanel({ provider: 'unsplash' })
        expect(imageLayer(w)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses picsum placeholder for pexels provider', async () => {
        const w = await mountPanel({ provider: 'pexels' })
        expect(imageLayer(w)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses picsum placeholder for pixabay provider', async () => {
        const w = await mountPanel({ provider: 'pixabay' })
        expect(imageLayer(w)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses the configured URL for url provider', async () => {
        const w = await mountPanel({ provider: 'url', url: 'https://example.com/photo.jpg' })
        expect(imageLayer(w)!.attributes('style')).toContain('example.com/photo.jpg')
      })

      it('uses /api/background-file for upload provider', async () => {
        const w = await mountPanel({ provider: 'upload' })
        expect(imageLayer(w)!.attributes('style')).toContain('background-file')
      })
    })

    describe('image appearance', () => {
      it('applies no filter when blur is none', async () => {
        const w = await mountPanel({ provider: 'picsum', blur: 'none' })
        expect(imageLayer(w)!.attributes('style')).not.toContain('blur')
      })

      it('applies blur(4px) for sm blur', async () => {
        const w = await mountPanel({ provider: 'picsum', blur: 'sm' })
        expect(imageLayer(w)!.attributes('style')).toContain('blur(4px)')
      })

      it('applies blur(12px) for md blur', async () => {
        const w = await mountPanel({ provider: 'picsum', blur: 'md' })
        expect(imageLayer(w)!.attributes('style')).toContain('blur(12px)')
      })

      it('applies blur(24px) for lg blur', async () => {
        const w = await mountPanel({ provider: 'picsum', blur: 'lg' })
        expect(imageLayer(w)!.attributes('style')).toContain('blur(24px)')
      })

      it('applies center top position for top setting', async () => {
        const w = await mountPanel({ provider: 'picsum', position: 'top' })
        expect(imageLayer(w)!.attributes('style')).toContain('center top')
      })

      it('applies center bottom position for bottom setting', async () => {
        const w = await mountPanel({ provider: 'picsum', position: 'bottom' })
        expect(imageLayer(w)!.attributes('style')).toContain('center bottom')
      })

      it('applies left center position for left setting', async () => {
        const w = await mountPanel({ provider: 'picsum', position: 'left' })
        expect(imageLayer(w)!.attributes('style')).toContain('left center')
      })

      it('reflects overlay opacity in overlay layer', async () => {
        const w = await mountPanel({ provider: 'picsum', overlay: 60 })
        expect(overlayLayer(w)!.attributes('style')).toContain('0.6)')
      })

      it('reflects zero overlay opacity', async () => {
        const w = await mountPanel({ provider: 'picsum', overlay: 0 })
        expect(overlayLayer(w)!.attributes('style')).toContain(', 0)')
      })
    })

    describe('solid color layer', () => {
      it('includes the configured color in the gradient', async () => {
        const w = await mountPanel({ provider: 'none', color: '#ff0000' })
        expect(solidLayer(w)!.attributes('style')).toContain('#ff0000')
      })
    })

    describe('section and card mockup', () => {
      it('renders section mockup with My Services label', async () => {
        const w = await mountPanel()
        expect(w.text()).toContain('My Services')
      })

      it('applies glass section style by default', async () => {
        const w = await mountPanel({ sectionStyle: 'glass' })
        const section = findPreviewSection(w)
        expect(section!.attributes('style')).toContain('rgba(0, 0, 0, 0.3)')
      })

      it('applies dark section style', async () => {
        const w = await mountPanel({ sectionStyle: 'dark' })
        const section = findPreviewSection(w)
        expect(section!.attributes('style')).toContain('rgba(0, 0, 0, 0.5)')
      })

      it('applies darker section style', async () => {
        const w = await mountPanel({ sectionStyle: 'darker' })
        const section = findPreviewSection(w)
        expect(section!.attributes('style')).toContain('rgba(0, 0, 0, 0.75)')
      })

      it('applies none section style (transparent)', async () => {
        const w = await mountPanel({ sectionStyle: 'none' })
        const section = findPreviewSection(w)
        expect(section!.attributes('style')).toContain('transparent')
      })

      it('applies dark card style by default', async () => {
        const w = await mountPanel({ cardStyle: 'dark' })
        const card = findPreviewCard(w)
        expect(card!.attributes('style')).toContain('rgba(0, 0, 0, 0.6)')
      })

      it('applies glass card style', async () => {
        const w = await mountPanel({ cardStyle: 'glass' })
        const card = findPreviewCard(w)
        expect(card!.attributes('style')).toContain('rgba(0, 0, 0, 0.4)')
      })

      it('applies darker card style', async () => {
        const w = await mountPanel({ cardStyle: 'darker' })
        const card = findPreviewCard(w)
        expect(card!.attributes('style')).toContain('rgba(0, 0, 0, 0.8)')
      })

      it('updates section style when appearance form emits change', async () => {
        const w = await mountPanel({ sectionStyle: 'glass' })
        await w.findAll('button').find(b => b.text() === 'change-section')!.trigger('click')
        const section = findPreviewSection(w)
        expect(section!.attributes('style')).toContain('rgba(0, 0, 0, 0.75)')
      })

      it('updates card style when appearance form emits change', async () => {
        const w = await mountPanel({ cardStyle: 'dark' })
        await w.findAll('button').find(b => b.text() === 'change-card')!.trigger('click')
        const card = findPreviewCard(w)
        expect(card!.attributes('style')).toContain('rgba(0, 0, 0, 0.4)')
      })
    })
  })
})
