// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useAuth', () => ({ editEnabled: ref(true), needsLogin: ref(false) }))
vi.stubGlobal('$fetch', vi.fn())

const WIDGET_DEFS = {
  zebra: { name: 'Zebra', authType: 'none', fields: [{ label: 'Z field' }] },
  alpha: { name: 'Alpha', authType: 'header', fields: [{ label: 'A field' }] },
  middle: { name: 'Middle', authType: 'bearer', fields: [{ label: 'M field' }] },
}

vi.stubGlobal('widgetDefinitions', WIDGET_DEFS)

const fieldConfigData = ref<Record<string, string[]>>({})
vi.stubGlobal('useFetch', vi.fn(() => ({ data: fieldConfigData, refresh: vi.fn() })))

// Stub WidgetCard to render the widget name so we can check order
const WidgetCardStub = defineComponent({
  props: ['type', 'entry', 'activeLabels', 'isDirty', 'saving', 'authColors'],
  template: '<div class="widget-card-stub">{{ entry.name }}</div>',
})

import AdminWidgets from '~/pages/admin/service-fields.vue'

async function mountPage() {
  const App = defineComponent({
    components: { AdminWidgets },
    template: '<Suspense><AdminWidgets /></Suspense>',
  })
  const wrapper = mount(App, {
    global: {
      stubs: { ...globalStubs, WidgetCard: WidgetCardStub, Teleport: { template: '<div><slot /></div>' } },
    },
  })
  await flushPromises()
  return wrapper
}

describe('admin/widgets.vue', () => {
  describe('sort order', () => {
    it('renders widget cards alphabetically by name', async () => {
      const w = await mountPage()
      const cards = w.findAll('.widget-card-stub')
      const names = cards.map(c => c.text())
      expect(names).toEqual(['Alpha', 'Middle', 'Zebra'])
    })

    it('search filters and still sorts alphabetically', async () => {
      const w = await mountPage()
      const input = w.find('input[placeholder="Search widgets..."]')
      await input.setValue('a')
      const cards = w.findAll('.widget-card-stub')
      const names = cards.map(c => c.text())
      // 'alpha' matches 'a', 'zebra' matches 'zebra' (contains 'a')
      expect(names).toEqual([...names].sort())
    })

    it('search is case-insensitive', async () => {
      const w = await mountPage()
      const input = w.find('input[placeholder="Search widgets..."]')
      await input.setValue('ZEBRA')
      const cards = w.findAll('.widget-card-stub')
      expect(cards.length).toBe(1)
      expect(cards[0]!.text()).toBe('Zebra')
    })
  })
})
