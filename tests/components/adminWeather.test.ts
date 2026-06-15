// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { globalStubs } from './helpers'

vi.stubGlobal('definePageMeta', vi.fn())

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

type WeatherConfig = {
  locationMode: 'ip' | 'custom'
  location: { name?: string; lat?: number; lon?: number }
  units: 'celsius' | 'fahrenheit'
  display: { feelsLike: boolean; humidity: boolean; wind: boolean; laterToday: boolean; tomorrow: boolean }
}

function defaultConfig(): WeatherConfig {
  return {
    locationMode: 'ip',
    location: {},
    units: 'celsius',
    display: { feelsLike: true, humidity: true, wind: true, laterToday: true, tomorrow: true },
  }
}

function makeUseFetch(overrides: Partial<WeatherConfig> = {}) {
  const data = ref<WeatherConfig>({ ...defaultConfig(), ...overrides })
  const refresh = vi.fn().mockImplementation(() => {
    const lastPost = [...mockFetch.mock.calls].reverse()
      .find((c) => (c[1] as { method?: string })?.method === 'POST')
    if (lastPost)
      data.value = (lastPost[1] as { body: WeatherConfig }).body
  })
  return vi.fn(() => ({ data, refresh }))
}

vi.stubGlobal('useFetch', makeUseFetch())

import AdminWeather from '~/pages/admin/widgets/weather.vue'

async function mountPage(overrides: Partial<WeatherConfig> = {}) {
  vi.stubGlobal('useFetch', makeUseFetch(overrides))
  const App = defineComponent({
    components: { AdminWeather },
    template: '<Suspense><AdminWeather /></Suspense>',
  })
  const wrapper = mount(App, { global: { stubs: globalStubs } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('admin/weather.vue', () => {
  describe('layout', () => {
    it('renders Location, Units and Display sections', async () => {
      const w = await mountPage()
      expect(w.text()).toContain('Location')
      expect(w.text()).toContain('Units')
      expect(w.text()).toContain('Display')
    })
  })

  describe('dirty state', () => {
    it('Save and Cancel are disabled when not dirty', async () => {
      const w = await mountPage()
      expect(w.findAll('button').find(b => b.text() === 'Save')!.attributes('disabled')).toBeDefined()
      expect(w.findAll('button').find(b => b.text() === 'Cancel')!.attributes('disabled')).toBeDefined()
    })

    it('shows Unsaved changes when units changed', async () => {
      const w = await mountPage({ units: 'celsius' })
      await w.findAll('button').find(b => b.text().includes('Fahrenheit'))!.trigger('click')
      expect(w.text()).toContain('Unsaved changes')
    })

    it('Cancel resets form', async () => {
      const w = await mountPage({ units: 'celsius' })
      await w.findAll('button').find(b => b.text().includes('Fahrenheit'))!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Cancel')!.trigger('click')
      expect(w.text()).not.toContain('Unsaved changes')
    })
  })

  describe('location mode', () => {
    it('shows IP description when locationMode is ip', async () => {
      const w = await mountPage({ locationMode: 'ip' })
      expect(w.text()).toContain('IP address')
    })

    it('shows search input when locationMode is custom', async () => {
      const w = await mountPage({ locationMode: 'custom' })
      expect(w.find('input[type="text"]').exists()).toBe(true)
    })

    it('switching to custom shows search input', async () => {
      const w = await mountPage({ locationMode: 'ip' })
      await w.findAll('button').find(b => b.text() === 'Custom location')!.trigger('click')
      expect(w.find('input[type="text"]').exists()).toBe(true)
    })

    it('shows selected location name when custom location is set', async () => {
      const w = await mountPage({ locationMode: 'custom', location: { name: 'Montreal, Quebec, Canada', lat: 45.5, lon: -73.6 } })
      expect(w.text()).toContain('Montreal, Quebec, Canada')
    })
  })

  describe('location search', () => {
    it('calls geocoding API and shows results', async () => {
      mockFetch.mockResolvedValueOnce({ results: [
        { name: 'Paris', admin1: 'Ile-de-France', country: 'France', country_code: 'FR', latitude: 48.85, longitude: 2.35 },
      ] })
      const w = await mountPage({ locationMode: 'custom' })
      await w.find('input[type="text"]').setValue('Paris')
      await w.findAll('button').find(b => b.text() === 'Search')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Paris')
      expect(w.text()).toContain('France')
    })

    it('selecting a result sets location and clears search', async () => {
      mockFetch.mockResolvedValueOnce({ results: [
        { name: 'Paris', admin1: 'Ile-de-France', country: 'France', country_code: 'FR', latitude: 48.85, longitude: 2.35 },
      ] })
      const w = await mountPage({ locationMode: 'custom' })
      await w.find('input[type="text"]').setValue('Paris')
      await w.findAll('button').find(b => b.text() === 'Search')!.trigger('click')
      await flushPromises()
      await w.findAll('button').find(b => b.text().includes('Paris') && b.text().includes('France'))!.trigger('click')
      expect(w.text()).toContain('Paris, Ile-de-France, France')
      expect(w.find('input[type="text"]').element.value).toBe('')
    })

    it('stores admin1 and countryCode when selecting a result', async () => {
      mockFetch.mockResolvedValueOnce({ results: [
        { name: 'Paris', admin1: 'Ile-de-France', country: 'France', country_code: 'FR', latitude: 48.85, longitude: 2.35 },
      ] })
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ locationMode: 'custom' })
      await w.find('input[type="text"]').setValue('Paris')
      await w.findAll('button').find(b => b.text() === 'Search')!.trigger('click')
      await flushPromises()
      await w.findAll('button').find(b => b.text().includes('Paris') && b.text().includes('France'))!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      const postCall = mockFetch.mock.calls.find((c) => (c[1] as { method?: string })?.method === 'POST')
      const body = (postCall![1] as { body: Record<string, Record<string, unknown>> }).body
      expect(body.location.admin1).toBe('Ile-de-France')
      expect(body.location.countryCode).toBe('fr')
    })

    it('countryCode is lowercased when stored', async () => {
      mockFetch.mockResolvedValueOnce({ results: [
        { name: 'London', admin1: 'England', country: 'United Kingdom', country_code: 'GB', latitude: 51.5, longitude: -0.12 },
      ] })
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ locationMode: 'custom' })
      await w.find('input[type="text"]').setValue('London')
      await w.findAll('button').find(b => b.text() === 'Search')!.trigger('click')
      await flushPromises()
      await w.findAll('button').find(b => b.text().includes('London'))!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      const postCall = mockFetch.mock.calls.find((c) => (c[1] as { method?: string })?.method === 'POST')
      const body = (postCall![1] as { body: Record<string, Record<string, unknown>> }).body
      expect(body.location.countryCode).toBe('gb')
    })
  })

  describe('units', () => {
    it('Celsius button is active by default', async () => {
      const w = await mountPage({ units: 'celsius' })
      const btn = w.findAll('button').find(b => b.text().includes('Celsius'))!
      expect(btn.classes().join(' ')).toContain('accent')
    })

    it('clicking Fahrenheit makes it dirty', async () => {
      const w = await mountPage({ units: 'celsius' })
      await w.findAll('button').find(b => b.text().includes('Fahrenheit'))!.trigger('click')
      expect(w.text()).toContain('Unsaved changes')
    })
  })

  describe('display toggles', () => {
    it('renders 5 checkboxes', async () => {
      const w = await mountPage()
      expect(w.findAll('input[type="checkbox"]').length).toBe(5)
    })

    it('unchecking a box makes form dirty', async () => {
      const w = await mountPage()
      const checkboxes = w.findAll('input[type="checkbox"]')
      await checkboxes[0]!.setValue(false)
      expect(w.text()).toContain('Unsaved changes')
    })
  })

  describe('save', () => {
    it('calls $fetch POST on save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ units: 'celsius' })
      await w.findAll('button').find(b => b.text().includes('Fahrenheit'))!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/weather', expect.objectContaining({ method: 'POST' }))
    })

    it('shows Saved after successful save', async () => {
      mockFetch.mockResolvedValueOnce({})
      const w = await mountPage({ units: 'celsius' })
      await w.findAll('button').find(b => b.text().includes('Fahrenheit'))!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Saved')
    })

    it('shows error on save failure', async () => {
      mockFetch.mockRejectedValueOnce({ data: { message: 'Unauthorized' } })
      const w = await mountPage({ units: 'celsius' })
      await w.findAll('button').find(b => b.text().includes('Fahrenheit'))!.trigger('click')
      await w.findAll('button').find(b => b.text() === 'Save')!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Unauthorized')
    })
  })
})
