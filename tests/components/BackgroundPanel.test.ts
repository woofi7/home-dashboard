// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent, type VNode } from 'vue'
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

type PanelState = { isDirty: boolean; saving: boolean; saveError: string; saveSuccess: boolean }

async function mountPanel(config: Config = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(config))
  const states: PanelState[] = []
  const App = defineComponent({
    components: { BackgroundPanel },
    template: '<Suspense><BackgroundPanel @state="onState" /></Suspense>',
    methods: {
      onState(s: PanelState) { states.push(s) },
    },
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
  const panel = wrapper.findComponent(BackgroundPanel)
  return { wrapper, states, panel }
}

function lastState(states: PanelState[]): PanelState {
  return states[states.length - 1] ?? { isDirty: false, saving: false, saveError: '', saveSuccess: false }
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
  return wrapper.find('[data-testid="preview-section"]')
}

function findPreviewCard(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('[data-testid="preview-card"]')
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('BackgroundPanel.vue', () => {
  describe('layout', () => {
    it('renders provider and appearance panels', async () => {
      const { wrapper } = await mountPanel()
      expect(wrapper.find('.provider-stub').exists()).toBe(true)
      expect(wrapper.find('.appearance-stub').exists()).toBe(true)
    })

    it('renders Background section heading', async () => {
      const { wrapper } = await mountPanel()
      expect(wrapper.text()).toContain('Background')
    })

    it('renders Appearance section heading', async () => {
      const { wrapper } = await mountPanel()
      expect(wrapper.text()).toContain('Appearance')
    })

    it('renders the Preview section', async () => {
      const { wrapper } = await mountPanel()
      expect(wrapper.text()).toContain('Preview')
    })

    it('passes savedProvider to the provider config', async () => {
      const { wrapper } = await mountPanel({ provider: 'upload' })
      expect(wrapper.find('.provider-stub').exists()).toBe(true)
    })
  })

  describe('dirty state', () => {
    it('emits isDirty false initially', async () => {
      const { states } = await mountPanel()
      expect(lastState(states).isDirty).toBe(false)
    })

    it('emits isDirty true when form changes', async () => {
      const { wrapper, states } = await mountPanel()
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(lastState(states).isDirty).toBe(true)
    })

    it('cancel emits isDirty false', async () => {
      const { wrapper, states, panel } = await mountPanel()
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
      expect(lastState(states).isDirty).toBe(true)
      ;(panel.vm as unknown as { cancel: () => void }).cancel()
      await flushPromises()
      expect(lastState(states).isDirty).toBe(false)
    })
  })

  describe('save', () => {
    async function makeDirty(wrapper: ReturnType<typeof mount>) {
      await wrapper.findAll('button').find(b => b.text() === 'switch-provider')!.trigger('click')
    }

    it('calls $fetch POST on save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const { wrapper, panel } = await mountPanel()
      await makeDirty(wrapper)
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/background', expect.objectContaining({ method: 'POST' }))
    })

    it('emits saveSuccess true after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const { wrapper, states, panel } = await mountPanel()
      await makeDirty(wrapper)
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(lastState(states).saveSuccess).toBe(true)
    })

    it('emits saveError on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
      const { wrapper, states, panel } = await mountPanel()
      await makeDirty(wrapper)
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(lastState(states).saveError).toBe('Unauthorized')
    })
  })

  describe('sticky preview positioning', () => {
    it('preview wrapper has sticky class', async () => {
      const { wrapper } = await mountPanel()
      const stickyEl = wrapper.findAll('div').find(el => el.classes().includes('sticky'))
      expect(stickyEl).toBeTruthy()
    })

    it('preview wrapper top is calc(var(--admin-header-h, 4rem) + 1rem)', async () => {
      const { panel } = await mountPanel()
      // happy-dom strips CSS custom-property values from element.style entirely, so we inspect
      // the VNode props (pre-DOM) where the bound value is preserved.
      function findStickyVNodeProps(vnode: VNode | null | undefined): Record<string, unknown> | null {
        if (!vnode) return null
        if (typeof vnode.type === 'string' && typeof vnode.props?.class === 'string' && vnode.props.class.includes('sticky')) {
          return vnode.props as Record<string, unknown>
        }
        const children = vnode.children
        if (Array.isArray(children)) {
          for (const child of children) {
            const found = findStickyVNodeProps(child as VNode)
            if (found) return found
          }
        }
        const subTree = (vnode as unknown as { component?: { subTree?: VNode } }).component?.subTree
        if (subTree) {
          return findStickyVNodeProps(subTree)
        }
        return null
      }
      const vm = panel.vm as unknown as { $: { subTree: VNode } }
      const props = findStickyVNodeProps(vm.$.subTree)
      expect((props?.style as Record<string, string>)?.top).toBe('calc(var(--admin-header-h, 4rem) + 1rem)')
    })

    it('preview wrapper has z-10 to stay in proper stacking order', async () => {
      const { wrapper } = await mountPanel()
      const stickyEl = wrapper.findAll('div').find(el => el.classes().includes('sticky'))!
      expect(stickyEl.classes()).toContain('z-10')
    })

    it('preview is ordered last on large screens (lg:order-2)', async () => {
      const { wrapper } = await mountPanel()
      const stickyEl = wrapper.findAll('div').find(el => el.classes().includes('sticky'))!
      expect(stickyEl.classes()).toContain('lg:order-2')
    })
  })

  describe('preview', () => {
    describe('background layers', () => {
      it('shows image layer for image provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum' })
        expect(imageLayer(wrapper)).toBeTruthy()
      })

      it('shows overlay layer for image provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum' })
        expect(overlayLayer(wrapper)).toBeTruthy()
      })

      it('shows no image layer when provider is none', async () => {
        const { wrapper } = await mountPanel({ provider: 'none' })
        expect(imageLayer(wrapper)).toBeFalsy()
      })

      it('shows no overlay layer when provider is none', async () => {
        const { wrapper } = await mountPanel({ provider: 'none' })
        expect(overlayLayer(wrapper)).toBeFalsy()
      })

      it('shows solid color layer when provider is none', async () => {
        const { wrapper } = await mountPanel({ provider: 'none' })
        expect(solidLayer(wrapper)).toBeTruthy()
      })

      it('shows no solid layer for image provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum' })
        expect(solidLayer(wrapper)).toBeFalsy()
      })
    })

    describe('image URL', () => {
      it('uses picsum for picsum provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses picsum placeholder for unsplash provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'unsplash' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses picsum placeholder for pexels provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'pexels' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses picsum placeholder for pixabay provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'pixabay' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('picsum.photos')
      })

      it('uses the configured URL for url provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'url', url: 'https://example.com/photo.jpg' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('example.com/photo.jpg')
      })

      it('uses /api/background-file for upload provider', async () => {
        const { wrapper } = await mountPanel({ provider: 'upload' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('background-file')
      })
    })

    describe('image appearance', () => {
      it('applies no filter when blur is none', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', blur: 'none' })
        expect(imageLayer(wrapper)!.attributes('style')).not.toContain('blur')
      })

      it('applies blur(4px) for sm blur', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', blur: 'sm' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('blur(4px)')
      })

      it('applies blur(12px) for md blur', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', blur: 'md' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('blur(12px)')
      })

      it('applies blur(24px) for lg blur', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', blur: 'lg' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('blur(24px)')
      })

      it('applies center top position for top setting', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', position: 'top' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('center top')
      })

      it('applies center bottom position for bottom setting', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', position: 'bottom' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('center bottom')
      })

      it('applies left center position for left setting', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', position: 'left' })
        expect(imageLayer(wrapper)!.attributes('style')).toContain('left center')
      })

      it('reflects overlay opacity in overlay layer', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', overlay: 60 })
        expect(overlayLayer(wrapper)!.attributes('style')).toContain('0.6)')
      })

      it('reflects zero overlay opacity', async () => {
        const { wrapper } = await mountPanel({ provider: 'picsum', overlay: 0 })
        expect(overlayLayer(wrapper)!.attributes('style')).toContain(', 0)')
      })
    })

    describe('solid color layer', () => {
      it('includes the configured color in the gradient', async () => {
        const { wrapper } = await mountPanel({ provider: 'none', color: '#ff0000' })
        expect(solidLayer(wrapper)!.attributes('style')).toContain('#ff0000')
      })
    })

    describe('section and card mockup', () => {
      it('renders section mockup with My Services label', async () => {
        const { wrapper } = await mountPanel()
        expect(wrapper.text()).toContain('My Services')
      })

      it('applies glass section style by default', async () => {
        const { wrapper } = await mountPanel({ sectionStyle: 'glass' })
        const section = findPreviewSection(wrapper)
        expect(section.exists()).toBe(true)
        expect(section.attributes('style')).toContain('blur(12px)')
      })

      it('applies dark section style', async () => {
        const { wrapper } = await mountPanel({ sectionStyle: 'dark' })
        const section = findPreviewSection(wrapper)
        expect(section.exists()).toBe(true)
        expect(section.attributes('style')).toContain('var(--color-surface)')
      })

      it('applies darker section style', async () => {
        const { wrapper } = await mountPanel({ sectionStyle: 'darker' })
        const section = findPreviewSection(wrapper)
        expect(section.exists()).toBe(true)
        expect(section.attributes('style')).toContain('var(--color-base)')
      })

      it('applies none section style (transparent)', async () => {
        const { wrapper } = await mountPanel({ sectionStyle: 'none' })
        const section = findPreviewSection(wrapper)
        expect(section.exists()).toBe(true)
        expect(section.attributes('style')).toContain('transparent')
      })

      it('applies dark card style by default', async () => {
        const { wrapper } = await mountPanel({ cardStyle: 'dark' })
        const card = findPreviewCard(wrapper)
        expect(card.exists()).toBe(true)
        expect(card.attributes('style')).toContain('var(--color-elevated)')
      })

      it('applies glass card style', async () => {
        const { wrapper } = await mountPanel({ cardStyle: 'glass' })
        const card = findPreviewCard(wrapper)
        expect(card.exists()).toBe(true)
        expect(card.attributes('style')).toContain('blur(4px)')
      })

      it('applies darker card style', async () => {
        const { wrapper } = await mountPanel({ cardStyle: 'darker' })
        const card = findPreviewCard(wrapper)
        expect(card.exists()).toBe(true)
        expect(card.attributes('style')).toContain('var(--color-base)')
      })

      it('updates section style when appearance form emits change', async () => {
        const { wrapper } = await mountPanel({ sectionStyle: 'glass' })
        await wrapper.findAll('button').find(b => b.text() === 'change-section')!.trigger('click')
        await flushPromises()
        const section = findPreviewSection(wrapper)
        expect(section.exists()).toBe(true)
        expect(section.attributes('style')).toContain('var(--color-base)')
      })

      it('updates card style when appearance form emits change', async () => {
        const { wrapper } = await mountPanel({ cardStyle: 'dark' })
        await wrapper.findAll('button').find(b => b.text() === 'change-card')!.trigger('click')
        await flushPromises()
        const card = findPreviewCard(wrapper)
        expect(card.exists()).toBe(true)
        expect(card.attributes('style')).toContain('blur(4px)')
      })
    })
  })
})
