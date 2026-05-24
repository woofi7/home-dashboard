import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCacheGet, mockCacheSet } = vi.hoisted(() => ({
  mockCacheGet: vi.fn().mockReturnValue(null),
  mockCacheSet: vi.fn((data: unknown) => data),
}))

vi.mock('../server/utils/cache', () => ({
  createCache: () => ({
    get: mockCacheGet,
    set: mockCacheSet,
    clear: vi.fn(),
    fetch: vi.fn(),
  }),
}))

const mockLoadConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
}))

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

import handler from '../server/api/weather.get'

function makeGeoResponse(overrides: Record<string, unknown> = {}) {
  return { city: 'Montreal', regionName: 'Quebec', lat: 45.5, lon: -73.6, countryCode: 'CA', ...overrides }
}

function makeWeatherResponse() {
  return {
    current: {
      time: '2026-05-24T15:00',
      temperature_2m: 20,
      apparent_temperature: 18,
      relative_humidity_2m: 60,
      wind_speed_10m: 15,
      weather_code: 0,
    },
    hourly: {
      time: ['2026-05-24T16:00', '2026-05-24T17:00', '2026-05-24T18:00', '2026-05-24T19:00'],
      temperature_2m: [21, 20, 19, 18],
      apparent_temperature: [19, 18, 17, 16],
      weather_code: [0, 0, 0, 0],
      precipitation_probability: [0, 0, 0, 0],
      wind_speed_10m: [12, 11, 10, 9],
    },
    daily: {
      time: ['2026-05-24', '2026-05-25'],
      temperature_2m_min: [12, 13],
      temperature_2m_max: [22, 23],
      weather_code: [0, 1],
      precipitation_probability_max: [0, 10],
      wind_speed_10m_max: [20, 18],
    },
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockCacheGet.mockReturnValue(null)
  mockCacheSet.mockImplementation((data: unknown) => data)
  mockLoadConfig.mockReturnValue({})
})

describe('weather.get', () => {
  describe('cache', () => {
    it('returns cached data without calling $fetch', async () => {
      mockCacheGet.mockReturnValue({ city: 'Cached City', temp: 99, url: 'https://example.com' })
      const result = await (handler as Function)() as { city: string; temp: number }
      expect(result.city).toBe('Cached City')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('IP geolocation mode', () => {
    beforeEach(() => {
      mockLoadConfig.mockReturnValue({ weather: { locationMode: 'ip' } })
    })

    it('calls ip-api.com for location', async () => {
      mockFetch.mockResolvedValueOnce(makeGeoResponse()).mockResolvedValueOnce(makeWeatherResponse())
      await (handler as Function)()
      expect((mockFetch.mock.calls[0]![0] as string)).toContain('ip-api.com')
    })

    it('builds meteomedia URL with countryCode and regionName', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse({ city: 'Montreal', regionName: 'Quebec', countryCode: 'CA' }))
        .mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toBe('https://www.meteomedia.com/fr/ville/ca/quebec/montreal/actuelle')
    })

    it('lowercases countryCode in URL', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse({ countryCode: 'US', regionName: 'New York', city: 'New York' }))
        .mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toContain('/us/')
    })

    it('slugifies regionName with spaces', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse({ regionName: 'New Brunswick', city: 'Moncton', countryCode: 'CA' }))
        .mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toContain('/new-brunswick/')
    })

    it('normalizes accented chars in province slug', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse({ regionName: 'Île-de-France', city: 'Paris', countryCode: 'FR' }))
        .mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toContain('/ile-de-france/')
    })

    it('returns city name from IP response', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse({ city: 'Quebec City' }))
        .mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { city: string }
      expect(result.city).toBe('Quebec City')
    })
  })

  describe('custom location mode', () => {
    function customSettings(location: Record<string, unknown>) {
      return { weather: { locationMode: 'custom', location } }
    }

    it('does not call ip-api.com', async () => {
      mockLoadConfig.mockReturnValue(customSettings({ name: 'Paris', lat: 48.85, lon: 2.35, admin1: 'Ile-de-France', countryCode: 'fr' }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      await (handler as Function)()
      expect(mockFetch.mock.calls.every((c: unknown[]) => !(c[0] as string).includes('ip-api'))).toBe(true)
    })

    it('builds meteomedia URL with stored admin1 and countryCode', async () => {
      mockLoadConfig.mockReturnValue(customSettings({
        name: 'Saint-Jean-sur-Richelieu, Quebec, Canada',
        lat: 45.3, lon: -73.3,
        admin1: 'Quebec',
        countryCode: 'ca',
      }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toBe('https://www.meteomedia.com/fr/ville/ca/quebec/saint-jean-sur-richelieu/actuelle')
    })

    it('uses only the city part of the stored name as city', async () => {
      mockLoadConfig.mockReturnValue(customSettings({
        name: 'Saint-Jean-sur-Richelieu, Quebec, Canada',
        lat: 45.3, lon: -73.3,
        admin1: 'Quebec',
        countryCode: 'ca',
      }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { city: string }
      expect(result.city).toBe('Saint-Jean-sur-Richelieu')
    })

    it('normalizes accented chars in city slug', async () => {
      mockLoadConfig.mockReturnValue(customSettings({
        name: 'Île-Perrot, Quebec, Canada',
        lat: 45.38, lon: -73.95,
        admin1: 'Quebec',
        countryCode: 'ca',
      }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toContain('/ile-perrot/actuelle')
    })

    it('normalizes accented chars in province slug', async () => {
      mockLoadConfig.mockReturnValue(customSettings({
        name: 'Montreal, Québec, Canada',
        lat: 45.5, lon: -73.6,
        admin1: 'Québec',
        countryCode: 'ca',
      }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toContain('/quebec/')
    })

    it('falls back to simple URL when admin1 is missing', async () => {
      mockLoadConfig.mockReturnValue(customSettings({ name: 'Paris', lat: 48.85, lon: 2.35 }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toBe('https://www.meteomedia.com/fr/meteo/paris')
    })

    it('falls back to simple URL when countryCode is missing', async () => {
      mockLoadConfig.mockReturnValue(customSettings({ name: 'Lyon', lat: 45.75, lon: 4.83, admin1: 'Auvergne-Rhône-Alpes' }))
      mockFetch.mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { url: string }
      expect(result.url).toBe('https://www.meteomedia.com/fr/meteo/lyon')
    })
  })

  describe('units', () => {
    it('returns unit C for celsius', async () => {
      mockLoadConfig.mockReturnValue({ weather: { units: 'celsius' } })
      mockFetch.mockResolvedValueOnce(makeGeoResponse()).mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { unit: string }
      expect(result.unit).toBe('C')
    })

    it('returns unit F for fahrenheit', async () => {
      mockLoadConfig.mockReturnValue({ weather: { units: 'fahrenheit' } })
      mockFetch.mockResolvedValueOnce(makeGeoResponse()).mockResolvedValueOnce(makeWeatherResponse())
      const result = await (handler as Function)() as { unit: string }
      expect(result.unit).toBe('F')
    })
  })
})
