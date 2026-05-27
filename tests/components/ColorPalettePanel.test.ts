// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'
import { COLOR_PALETTES } from '~/utils/colorPalettes'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock applyPalette so we can verify it's called without touching the DOM
const mockApplyPalette = vi.fn()
const mockGetPaletteById = vi.fn((id: string) => COLOR_PALETTES.find(p => p.id === id) ?? COLOR_PALETTES[0])
vi.mock('~/utils/colorPalettes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/colorPalettes')>()
  return {
    ...actual,
    applyPalette: (...args: unknown[]) => mockApplyPalette(...args),
    getPaletteById: (id: string) => mockGetPaletteById(id),
  }
})

function makeUseFetch(colorPalette = 'indigo') {
  const data = ref<Record<string, unknown>>({ colorPalette })
  const refresh = vi.fn()
  return vi.fn(() => ({ data, refresh }))
}

vi.stubGlobal('useFetch', makeUseFetch())

import ColorPalettePanel from '~/components/admin/ColorPalettePanel.vue'

type PanelState = { isDirty: boolean; saving: boolean; saveError: string; saveSuccess: boolean }

async function mountPanel(colorPalette = 'indigo') {
  vi.stubGlobal('useFetch', makeUseFetch(colorPalette))
  const states: PanelState[] = []
  const App = defineComponent({
    components: { ColorPalettePanel },
    template: '<Suspense><ColorPalettePanel ref="panel" @state="onState" /></Suspense>',
    methods: {
      onState(s: PanelState) { states.push(s) },
    },
  })
  const wrapper = mount(App, { global: { stubs: globalStubs } })
  await flushPromises()
  return { wrapper, states, panel: wrapper.findComponent(ColorPalettePanel) }
}

function lastState(states: PanelState[]): PanelState {
  return states[states.length - 1] ?? { isDirty: false, saving: false, saveError: '', saveSuccess: false }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockApplyPalette.mockClear()
  mockGetPaletteById.mockClear()
})

describe('ColorPalettePanel.vue', () => {
  describe('layout', () => {
    it('renders Color Palette heading', async () => {
      const { wrapper } = await mountPanel()
      expect(wrapper.text()).toContain('Color Palette')
    })

    it('renders a button for each palette', async () => {
      const { wrapper } = await mountPanel()
      for (const palette of COLOR_PALETTES) {
        expect(wrapper.text()).toContain(palette.name)
      }
    })

    it('renders exactly 6 palette buttons', async () => {
      const { wrapper } = await mountPanel()
      const paletteButtons = wrapper.findAll('button').filter(b =>
        COLOR_PALETTES.some(p => b.text().includes(p.name)),
      )
      expect(paletteButtons).toHaveLength(6)
    })

    it('renders Aa text color swatches in each palette card', async () => {
      const { wrapper } = await mountPanel()
      const aaSpans = wrapper.findAll('span').filter(s => s.text() === 'Aa')
      // 3 swatches per palette x 6 palettes
      expect(aaSpans).toHaveLength(18)
    })

    it('applies palette primary color to the first Aa swatch', async () => {
      const { wrapper } = await mountPanel()
      const indigoCard = wrapper.findAll('button').find(b => b.text().includes('Indigo'))!
      const firstAa = indigoCard.findAll('span').find(s => s.text() === 'Aa')!
      const indigoPalette = COLOR_PALETTES.find(p => p.id === 'indigo')!
      expect(firstAa.attributes('style')).toContain(indigoPalette.primary)
    })

    it('each palette card shows distinct text colors', async () => {
      const { wrapper } = await mountPanel()
      const indigoCard = wrapper.findAll('button').find(b => b.text().includes('Indigo'))!
      const violetCard = wrapper.findAll('button').find(b => b.text().includes('Violet'))!
      const indigoAa = indigoCard.findAll('span').find(s => s.text() === 'Aa')!
      const violetAa = violetCard.findAll('span').find(s => s.text() === 'Aa')!
      expect(indigoAa.attributes('style')).not.toBe(violetAa.attributes('style'))
    })
  })

  describe('initialization', () => {
    it('calls applyPalette on mount with the active palette', async () => {
      await mountPanel('emerald')
      expect(mockApplyPalette).toHaveBeenCalledWith(expect.objectContaining({ id: 'emerald' }))
    })

    it('reflects the palette from settings as active', async () => {
      const { wrapper } = await mountPanel('rose')
      const roseBtn = wrapper.findAll('button').find(b => b.text().includes('Rose'))!
      expect(roseBtn.find('[data-icon="check"]').exists()).toBe(true)
    })
  })

  describe('active state', () => {
    it('shows check icon on the active palette', async () => {
      const { wrapper } = await mountPanel('emerald')
      const emeraldBtn = wrapper.findAll('button').find(b => b.text().includes('Emerald'))!
      expect(emeraldBtn.find('[data-icon="check"]').exists()).toBe(true)
    })

    it('does not show check icon on inactive palettes', async () => {
      const { wrapper } = await mountPanel('indigo')
      const emeraldBtn = wrapper.findAll('button').find(b => b.text().includes('Emerald'))!
      expect(emeraldBtn.find('[data-icon="check"]').exists()).toBe(false)
    })

    it('emits isDirty false initially', async () => {
      const { states } = await mountPanel('indigo')
      expect(lastState(states).isDirty).toBe(false)
    })
  })

  describe('selecting a palette', () => {
    it('emits isDirty true when a different palette is clicked', async () => {
      const { wrapper, states } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Emerald'))!.trigger('click')
      expect(lastState(states).isDirty).toBe(true)
    })

    it('calls applyPalette immediately when a palette is clicked (preview)', async () => {
      const { wrapper } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Sky'))!.trigger('click')
      expect(mockApplyPalette).toHaveBeenCalled()
    })

    it('moves the check icon to the newly selected palette', async () => {
      const { wrapper } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Violet'))!.trigger('click')
      const violetBtn = wrapper.findAll('button').find(b => b.text().includes('Violet'))!
      const indigoBtn = wrapper.findAll('button').find(b => b.text().includes('Indigo'))!
      expect(violetBtn.find('[data-icon="check"]').exists()).toBe(true)
      expect(indigoBtn.find('[data-icon="check"]').exists()).toBe(false)
    })

    it('clicking the already-active palette does not emit isDirty', async () => {
      const { wrapper, states } = await mountPanel('rose')
      await wrapper.findAll('button').find(b => b.text().includes('Rose'))!.trigger('click')
      expect(lastState(states).isDirty).toBe(false)
    })
  })

  describe('cancel', () => {
    it('resets selection to saved palette', async () => {
      const { wrapper, states, panel } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Amber'))!.trigger('click')
      ;(panel.vm as unknown as { cancel: () => void }).cancel()
      await flushPromises()
      const indigoBtn = wrapper.findAll('button').find(b => b.text().includes('Indigo'))!
      expect(indigoBtn.find('[data-icon="check"]').exists()).toBe(true)
      expect(lastState(states).isDirty).toBe(false)
    })

    it('calls applyPalette with the original palette on cancel', async () => {
      const { wrapper, panel } = await mountPanel('sky')
      await wrapper.findAll('button').find(b => b.text().includes('Rose'))!.trigger('click')
      mockApplyPalette.mockClear()
      ;(panel.vm as unknown as { cancel: () => void }).cancel()
      await flushPromises()
      expect(mockApplyPalette).toHaveBeenCalledOnce()
      const appliedPalette = mockApplyPalette.mock.calls[0][0]
      expect(appliedPalette.id).toBe('sky')
    })
  })

  describe('save', () => {
    it('POSTs colorPalette to /api/edit/settings', async () => {
      mockFetch.mockResolvedValueOnce({})
      const { wrapper, panel } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Emerald'))!.trigger('click')
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/edit/settings', expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ colorPalette: 'emerald' }),
      }))
    })

    it('emits saveSuccess true after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const { wrapper, states, panel } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Sky'))!.trigger('click')
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(lastState(states).saveSuccess).toBe(true)
    })

    it('emits isDirty false after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const { wrapper, states, panel } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Violet'))!.trigger('click')
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(lastState(states).isDirty).toBe(false)
    })

    it('emits saveError on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
      const { wrapper, states, panel } = await mountPanel('indigo')
      await wrapper.findAll('button').find(b => b.text().includes('Rose'))!.trigger('click')
      await (panel.vm as unknown as { save: () => Promise<void> }).save()
      await flushPromises()
      expect(lastState(states).saveError).toBe('Unauthorized')
    })
  })
})
