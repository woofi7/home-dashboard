import { describe, it, expect, vi } from 'vitest'

vi.mock('../server/utils/widgetRegistry', () => ({ WIDGETS: { sonarr: vi.fn() } }))
vi.stubGlobal('getQuery', vi.fn())

import { classifyWidgetError, runWidget, widgetEndpoint, isWidgetError } from '../server/utils/widgetError'
import type { ServiceCredentials } from '../server/utils/auth'

const creds = { url: 'http://x' } as ServiceCredentials

describe('classifyWidgetError', () => {
  it.each([
    [{ response: { status: 401 } }, 'auth', 401],
    [{ response: { status: 403 } }, 'auth', 403],
    [{ response: { status: 404 } }, 'notFound', 404],
    [{ response: { status: 500 } }, 'badResponse', 500],
    [{ statusCode: 502 }, 'badResponse', 502],
  ])('maps an HTTP status to a kind', (err, kind, status) => {
    const r = classifyWidgetError(err)
    expect(r.kind).toBe(kind)
    expect(r.status).toBe(status)
  })

  it('classifies ECONNREFUSED (via cause) as unreachable', () => {
    expect(classifyWidgetError({ cause: { code: 'ECONNREFUSED' } }).kind).toBe('unreachable')
  })

  it('classifies ENOTFOUND (top-level code) as unreachable', () => {
    expect(classifyWidgetError({ code: 'ENOTFOUND' }).kind).toBe('unreachable')
  })

  it('classifies AbortError as timeout', () => {
    expect(classifyWidgetError({ name: 'AbortError' }).kind).toBe('timeout')
  })

  it('classifies a *_TIMEOUT code as timeout', () => {
    expect(classifyWidgetError({ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }).kind).toBe('timeout')
  })

  it('falls back to unknown and keeps the message', () => {
    const r = classifyWidgetError(new Error('boom'))
    expect(r.kind).toBe('unknown')
    expect(r.message).toBe('boom')
  })
})

describe('runWidget', () => {
  it('returns the result on success', async () => {
    const r = await runWidget(async () => ({ fields: [{ label: 'A', value: 1 }] }), creds)
    expect(isWidgetError(r)).toBe(false)
  })

  it('maps a null result to a noData error', async () => {
    const r = await runWidget(async () => null, creds)
    expect(isWidgetError(r) && r.error.kind).toBe('noData')
  })

  it('classifies a thrown error', async () => {
    const r = await runWidget(async () => { throw { response: { status: 401 } } }, creds)
    expect(isWidgetError(r) && r.error.kind).toBe('auth')
  })
})

describe('widgetEndpoint', () => {
  it('returns a config error when a required cred is missing', async () => {
    (getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ url: 'http://x' })
    const r = await widgetEndpoint({} as never, vi.fn(), ['url', 'apiKey'])
    expect(isWidgetError(r) && r.error.kind).toBe('config')
    expect(isWidgetError(r) && r.error.message).toContain('apiKey')
  })

  it('runs the fetcher when required creds are present', async () => {
    (getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ url: 'http://x', apiKey: 'k' })
    const fn = vi.fn().mockResolvedValue({ fields: [] })
    const r = await widgetEndpoint({} as never, fn, ['url', 'apiKey'])
    expect(fn).toHaveBeenCalled()
    expect(isWidgetError(r)).toBe(false)
  })
})
