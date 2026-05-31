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

function configWithTasks(taskMode?: string) {
  return {
    google: {
      clientId: 'cid',
      clientSecret: 'csec',
      refreshToken: 'rtok',
      calendar: { showEvents: false, showTasks: true, daysAhead: 2, ...(taskMode ? { taskMode } : {}) },
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

  })

  describe('tasks error reporting', () => {
    it('tasksError is null when tasks load successfully', async () => {
      mockLoadConfig.mockReturnValue(configWithTasks())
      mockFetch.mockResolvedValueOnce({ items: [{ id: 'l1' }] }) // task lists
      mockFetch.mockResolvedValueOnce({ items: [] })             // tasks for list
      const result = await (handler as () => Promise<unknown>)() as { tasksError: string | null }
      expect(result.tasksError).toBeNull()
    })

    it('default (everything) mode has no dueMin so overdue tasks are included', async () => {
      mockLoadConfig.mockReturnValue(configWithTasks())
      mockFetch.mockResolvedValueOnce({ items: [{ id: 'l1' }] })
      mockFetch.mockResolvedValueOnce({ items: [] })
      await (handler as () => Promise<unknown>)()
      const tasksUrl = mockFetch.mock.calls.at(-1)![0] as string
      expect(tasksUrl).not.toContain('dueMin=')
      expect(tasksUrl).toContain('dueMax=')
    })

    it('overdue mode also has no dueMin and caps dueMax earlier than everything mode', async () => {
      const sot = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate())
      const tomorrow = new Date(sot); tomorrow.setDate(tomorrow.getDate() + 1)
      const endOfRange = new Date(sot); endOfRange.setDate(endOfRange.getDate() + 2) // daysAhead = 2

      mockLoadConfig.mockReturnValue(configWithTasks('overdue'))
      mockFetch.mockResolvedValueOnce({ items: [{ id: 'l1' }] })
      mockFetch.mockResolvedValueOnce({ items: [] })
      await (handler as () => Promise<unknown>)()
      const overdueUrl = new URL(mockFetch.mock.calls.at(-1)![0] as string)
      expect(overdueUrl.searchParams.get('dueMin')).toBeNull()
      expect(overdueUrl.searchParams.get('dueMax')).toBe(tomorrow.toISOString())

      mockFetch.mockReset()
      mockLoadConfig.mockReturnValue(configWithTasks('all'))
      mockFetch.mockResolvedValueOnce({ access_token: 'tok', expires_in: 3600 })
      mockFetch.mockResolvedValueOnce({ items: [{ id: 'l1' }] })
      mockFetch.mockResolvedValueOnce({ items: [] })
      await (handler as () => Promise<unknown>)()
      const allUrl = new URL(mockFetch.mock.calls.at(-1)![0] as string)
      expect(allUrl.searchParams.get('dueMax')).toBe(endOfRange.toISOString())
    })

    it('maps listId and the user-facing webViewLink onto tasks', async () => {
      mockLoadConfig.mockReturnValue(configWithTasks())
      mockFetch.mockResolvedValueOnce({ items: [{ id: 'list-123' }] })
      mockFetch.mockResolvedValueOnce({ items: [{ id: 'task-9', title: 'Buy milk', status: 'needsAction', webViewLink: 'https://tasks.google.com/task/abc' }] })
      const result = await (handler as () => Promise<unknown>)() as { tasks: { id: string; listId: string; url: string }[] }
      expect(result.tasks[0]).toMatchObject({ id: 'task-9', listId: 'list-123', url: 'https://tasks.google.com/task/abc' })
    })

    it('reports a Tasks-API-not-enabled message on accessNotConfigured', async () => {
      mockLoadConfig.mockReturnValue(configWithTasks())
      mockFetch.mockRejectedValueOnce({ data: { error: { status: 'PERMISSION_DENIED', errors: [{ reason: 'accessNotConfigured' }] } } })
      const result = await (handler as () => Promise<unknown>)() as { tasksError: string | null }
      expect(result.tasksError).toContain('Tasks API is not enabled')
    })

    it('reports a permission message on scope denial', async () => {
      mockLoadConfig.mockReturnValue(configWithTasks())
      mockFetch.mockRejectedValueOnce({ data: { error: { status: 'PERMISSION_DENIED', errors: [{ reason: 'insufficientPermissions' }] } } })
      const result = await (handler as () => Promise<unknown>)() as { tasksError: string | null }
      expect(result.tasksError).toContain('reconnect')
    })

    it('falls back to a generic message for unknown failures', async () => {
      mockLoadConfig.mockReturnValue(configWithTasks())
      mockFetch.mockRejectedValueOnce(new Error('network down'))
      const result = await (handler as () => Promise<unknown>)() as { tasksError: string | null }
      expect(result.tasksError).toBe('Could not load Google Tasks.')
    })
  })

  describe('color mapping cont.', () => {
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
