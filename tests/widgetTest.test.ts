import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetchWidget = vi.fn()
vi.mock('../server/utils/widgetError', () => ({
  fetchWidgetStatus: (...args: unknown[]) => mockFetchWidget(...args),
}))

vi.mock('../server/utils/widgetRegistry', () => ({
  WIDGETS: { sonarr: vi.fn(), radarr: vi.fn() },
}))

vi.mock('../server/utils/credentialMerge', () => ({
  CRED_FIELDS: ['apiKey', 'username', 'password', 'token', 'key', 'secret'],
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const e = new Error(message)
  ;(e as { statusCode?: number }).statusCode = statusCode
  return e
})

import handler from '../server/api/edit/widget-test.post'

const readBody = vi.mocked(globalThis.readBody as (e: unknown) => Promise<unknown>)

beforeEach(() => {
  mockFetchWidget.mockReset()
  readBody.mockReset()
})

describe('POST /api/edit/widget-test', () => {
  it('returns ok:true when widget returns fields', async () => {
    readBody.mockResolvedValue({ type: 'sonarr', url: 'http://10.0.1.2:8989/', apiKey: 'abc' })
    mockFetchWidget.mockResolvedValue({ type: 'sonarr', fields: [{ label: 'Series', value: 10 }] })
    const result = await (handler as Function)(null)
    expect(result).toEqual({ ok: true, fields: [{ label: 'Series', value: 10 }] })
  })

  it('returns ok:true even when fields array is empty (admin configured 0 visible fields)', async () => {
    readBody.mockResolvedValue({ type: 'sonarr', url: 'http://10.0.1.2:8989/', apiKey: 'abc' })
    mockFetchWidget.mockResolvedValue({ type: 'sonarr', fields: [] })
    const result = await (handler as Function)(null)
    expect(result).toMatchObject({ ok: true })
  })

  it('returns ok:false with status and message when the widget errors', async () => {
    readBody.mockResolvedValue({ type: 'sonarr', url: 'http://10.0.1.2:8989/', apiKey: 'abc' })
    mockFetchWidget.mockResolvedValue({ error: { kind: 'auth', status: 401, message: 'Credentials refused' } })
    const result = await (handler as Function)(null)
    expect(result).toMatchObject({ ok: false, status: 401, message: 'Credentials refused' })
  })

  it('only passes allowed credential fields to the widget fetcher', async () => {
    readBody.mockResolvedValue({ type: 'sonarr', url: 'http://x/', apiKey: 'k', injected: 'evil', server: 'nas' })
    mockFetchWidget.mockResolvedValue({ type: 'sonarr', fields: [] })
    await (handler as Function)(null)
    const calledCreds = mockFetchWidget.mock.calls[0]![1] as Record<string, unknown>
    expect(calledCreds.injected).toBeUndefined()
    expect(calledCreds.server).toBeUndefined()
    expect(calledCreds.apiKey).toBe('k')
  })

  it('throws 400 when type is missing', async () => {
    readBody.mockResolvedValue({ url: 'http://x/' })
    await expect((handler as Function)(null)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when url is missing', async () => {
    readBody.mockResolvedValue({ type: 'sonarr' })
    await expect((handler as Function)(null)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 for unknown widget type', async () => {
    readBody.mockResolvedValue({ type: 'unknown', url: 'http://x/' })
    await expect((handler as Function)(null)).rejects.toMatchObject({ statusCode: 404 })
  })
})
