import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../server/utils/cache', () => ({
  createCache: () => ({
    get: () => null,
    set: (data: unknown) => data,
    clear: vi.fn(),
  }),
}))

vi.mock('../server/utils/config', () => ({
  loadConfig: vi.fn(),
}))

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

import { loadConfig } from '../server/utils/config'
import handler from '../server/api/calendar.get'

const mockLoadConfig = vi.mocked(loadConfig)

// Use today's date so the server places the event in a matching day slot
const _now = new Date()
const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`

function makeGItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev1',
    summary: 'Team standup',
    htmlLink: 'https://cal.google.com/ev1',
    start: { dateTime: `${todayStr}T09:00:00` },
    end:   { dateTime: `${todayStr}T09:30:00` },
    ...overrides,
  }
}

function configWithCreds() {
  return {
    google: {
      clientId: 'cid',
      clientSecret: 'csec',
      refreshToken: 'rtok',
      calendar: { showEvents: true, showTasks: false, daysAhead: 2 },
    },
  }
}

beforeEach(() => {
  mockFetch.mockReset()
  mockLoadConfig.mockReset()
  // token fetch
  mockFetch.mockResolvedValueOnce({ access_token: 'tok', expires_in: 3600 })
})

describe('GET /api/calendar', () => {
  describe('authorization', () => {
    it('returns authorized false when no credentials', async () => {
      mockLoadConfig.mockReturnValue({})
      const result = await (handler as () => Promise<unknown>)()
      expect(result).toMatchObject({ authorized: false })
    })

    it('returns authorized true with valid credentials', async () => {
      mockLoadConfig.mockReturnValue(configWithCreds())
      mockFetch.mockResolvedValueOnce({ items: [] })
      const result = await (handler as () => Promise<unknown>)()
      expect(result).toMatchObject({ authorized: true })
    })
  })

  describe('event color mapping', () => {
    it('includes event color when colorId is set', async () => {
      mockLoadConfig.mockReturnValue(configWithCreds())
      mockFetch.mockResolvedValueOnce({ items: [makeGItem({ colorId: '4' })] })
      const result = await (handler as () => Promise<unknown>)() as { days: { timed: { color?: string }[] }[] }
      const event = result.days.flatMap(d => d.timed)[0]
      expect(event.color).toBe('#E67C73')
    })

    it('color is undefined when colorId is absent', async () => {
      mockLoadConfig.mockReturnValue(configWithCreds())
      mockFetch.mockResolvedValueOnce({ items: [makeGItem()] })
      const result = await (handler as () => Promise<unknown>)() as { days: { timed: { color?: string }[] }[] }
      const event = result.days.flatMap(d => d.timed)[0]
      expect(event.color).toBeUndefined()
    })

    it('color is undefined for unknown colorId', async () => {
      mockLoadConfig.mockReturnValue(configWithCreds())
      mockFetch.mockResolvedValueOnce({ items: [makeGItem({ colorId: '99' })] })
      const result = await (handler as () => Promise<unknown>)() as { days: { timed: { color?: string }[] }[] }
      const event = result.days.flatMap(d => d.timed)[0]
      expect(event.color).toBeUndefined()
    })

    it('maps all 11 standard Google Calendar color IDs', async () => {
      const expected: Record<string, string> = {
        '1': '#7986CB', '2': '#33B679', '3': '#8E24AA',  '4': '#E67C73',
        '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5',  '8': '#616161',
        '9': '#3F51B5', '10': '#0F9D58', '11': '#D50000',
      }
      for (const [colorId, hex] of Object.entries(expected)) {
        mockFetch.mockReset()
        mockLoadConfig.mockReturnValue(configWithCreds())
        mockFetch.mockResolvedValueOnce({ access_token: 'tok', expires_in: 3600 })
        mockFetch.mockResolvedValueOnce({ items: [makeGItem({ id: `ev-${colorId}`, colorId })] })
        const result = await (handler as () => Promise<unknown>)() as { days: { timed: { color?: string }[] }[] }
        const event = result.days.flatMap(d => d.timed)[0]
        expect(event?.color, `colorId ${colorId}`).toBe(hex)
      }
    })
  })
})
