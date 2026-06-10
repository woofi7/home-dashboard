import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLoadConfigRaw = vi.fn()
const mockWriteConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfigRaw: (...args: unknown[]) => mockLoadConfigRaw(...args),
  writeConfig:   (...args: unknown[]) => mockWriteConfig(...args),
}))

vi.mock('../server/utils/adminAuth', () => ({
  assertAuth: vi.fn(),
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const e = new Error(message) as Error & { statusCode: number }
  e.statusCode = statusCode
  return e
})

import getHandler from '../server/api/admin/calendar.get'
import postHandler from '../server/api/admin/calendar.post'
import disconnectHandler from '../server/api/admin/calendar/disconnect.post'

const { readBody } = await import('../server/api/admin/calendar.post').then(() => ({
  readBody: vi.mocked(globalThis.readBody as (e: unknown) => Promise<unknown>),
}))

beforeEach(() => {
  mockLoadConfigRaw.mockReset()
  mockWriteConfig.mockReset()
  vi.mocked(globalThis.readBody as (...args: unknown[]) => unknown).mockReset?.()
})

describe('GET /api/admin/calendar', () => {
  it('returns empty strings and false when no google config', () => {
    mockLoadConfigRaw.mockReturnValue({})
    const result = (getHandler as (e: unknown) => unknown)(null)
    expect(result).toMatchObject({ clientId: '', hasClientSecret: false, hasRefreshToken: false })
  })

  it('returns clientId and a hasClientSecret flag, never the secret itself', () => {
    mockLoadConfigRaw.mockReturnValue({ google: { clientId: 'cid', clientSecret: 'csec' } })
    const result = (getHandler as (e: unknown) => unknown)(null) as Record<string, unknown>
    expect(result).toMatchObject({ clientId: 'cid', hasClientSecret: true, hasRefreshToken: false })
    expect(result.clientSecret).toBeUndefined()
  })

  it('returns hasRefreshToken true when refreshToken present', () => {
    mockLoadConfigRaw.mockReturnValue({ google: { clientId: 'x', refreshToken: 'tok' } })
    const result = (getHandler as (e: unknown) => unknown)(null)
    expect((result as { hasRefreshToken: boolean }).hasRefreshToken).toBe(true)
  })

  it('returns raw values without env substitution', () => {
    mockLoadConfigRaw.mockReturnValue({ google: { clientId: '${GOOGLE_CLIENT_ID}', clientSecret: '' } })
    const result = (getHandler as (e: unknown) => unknown)(null)
    expect((result as { clientId: string }).clientId).toBe('${GOOGLE_CLIENT_ID}')
  })

  it('returns default display settings when calendar config is absent', () => {
    mockLoadConfigRaw.mockReturnValue({ google: {} })
    const result = (getHandler as (e: unknown) => unknown)(null) as Record<string, unknown>
    expect(result.showEvents).toBe(true)
    expect(result.showTasks).toBe(false)
    expect(result.daysAhead).toBe(2)
    expect(result.taskMode).toBe('all')
  })

  it('returns saved display settings', () => {
    mockLoadConfigRaw.mockReturnValue({ google: { calendar: { showEvents: false, showTasks: true, daysAhead: 7, taskMode: 'overdue' } } })
    const result = (getHandler as (e: unknown) => unknown)(null) as Record<string, unknown>
    expect(result.showEvents).toBe(false)
    expect(result.showTasks).toBe(true)
    expect(result.daysAhead).toBe(7)
    expect(result.taskMode).toBe('overdue')
  })
})

describe('POST /api/admin/calendar', () => {
  it('writes clientId and clientSecret to settings', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: {} })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ clientId: 'new-id', clientSecret: 'new-sec' })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    expect(mockWriteConfig).toHaveBeenCalledWith('settings.yaml', expect.objectContaining({
      google: expect.objectContaining({ clientId: 'new-id', clientSecret: 'new-sec' }),
    }))
  })

  it('does not overwrite the stored secret when clientSecret is blank', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: { clientSecret: 'kept-secret' } })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ clientId: 'new-id', clientSecret: '' })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: Record<string, unknown> }
    expect(written.google.clientSecret).toBe('kept-secret')
    expect(written.google.clientId).toBe('new-id')
  })

  it('preserves existing refreshToken when saving credentials', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: { refreshToken: 'existing-tok' } })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ clientId: 'id', clientSecret: 'sec' })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: Record<string, unknown> }
    expect(written.google.refreshToken).toBe('existing-tok')
  })

  it('creates google key if missing in settings', async () => {
    mockLoadConfigRaw.mockReturnValue({})
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ clientId: 'id', clientSecret: 'sec' })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: Record<string, unknown> }
    expect(written.google).toBeDefined()
  })

  it('saves display settings to google.calendar', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: {} })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ showEvents: false, showTasks: true, daysAhead: 7 })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: { calendar: Record<string, unknown> } }
    expect(written.google.calendar).toEqual({ showEvents: false, showTasks: true, daysAhead: 7 })
  })

  it('saves the taskMode to google.calendar', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: {} })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ taskMode: 'overdue' })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: { calendar: Record<string, unknown> } }
    expect(written.google.calendar.taskMode).toBe('overdue')
  })

  it('merges display settings with existing calendar config', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: { calendar: { showEvents: true, showTasks: false, daysAhead: 3 } } })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ daysAhead: 14 })
    await (postHandler as (e: unknown) => Promise<unknown>)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: { calendar: Record<string, unknown> } }
    expect(written.google.calendar.daysAhead).toBe(14)
    expect(written.google.calendar.showEvents).toBe(true)
  })

  it('returns { ok: true }', async () => {
    mockLoadConfigRaw.mockReturnValue({ google: {} })
    vi.mocked(globalThis.readBody as (...args: unknown[]) => Promise<unknown>).mockResolvedValue({ clientId: 'id' })
    const result = await (postHandler as (e: unknown) => Promise<unknown>)(null)
    expect(result).toEqual({ ok: true })
  })
})

describe('POST /api/admin/calendar/disconnect', () => {
  it('removes refreshToken from settings', () => {
    mockLoadConfigRaw.mockReturnValue({ google: { clientId: 'id', refreshToken: 'tok' } })
    ;(disconnectHandler as (e: unknown) => unknown)(null)
    const written = mockWriteConfig.mock.calls[0][1] as { google: Record<string, unknown> }
    expect(written.google.refreshToken).toBeUndefined()
    expect(written.google.clientId).toBe('id')
  })

  it('does not throw when refreshToken was already absent', () => {
    mockLoadConfigRaw.mockReturnValue({ google: { clientId: 'id' } })
    expect(() => (disconnectHandler as (e: unknown) => unknown)(null)).not.toThrow()
  })
})
