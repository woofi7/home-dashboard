import { describe, it, expect, vi } from 'vitest'
import { apiFetch } from '../app/utils/apiFetch'

describe('apiFetch', () => {
  it('stamps `at` from the response Date header (the real snapshot time)', async () => {
    const date = 'Sat, 31 May 2026 12:00:00 GMT'
    const fetchMock = vi.fn(async (_url: string, opts: { onResponse: (ctx: { response: Response }) => void }) => {
      opts.onResponse({ response: { headers: new Headers({ date }) } as Response })
      return { ok: true }
    })
    vi.stubGlobal('$fetch', fetchMock)
    const { data, at } = await apiFetch<{ ok: boolean }>('/api/config')
    expect(data).toEqual({ ok: true })
    expect(at).toBe(new Date(date).getTime())
  })

  it('falls back to now when the Date header is absent', async () => {
    const before = Date.now()
    const fetchMock = vi.fn(async (_url: string, opts: { onResponse: (ctx: { response: Response }) => void }) => {
      opts.onResponse({ response: { headers: new Headers() } as Response })
      return {}
    })
    vi.stubGlobal('$fetch', fetchMock)
    const { at } = await apiFetch('/api/config')
    expect(at).toBeGreaterThanOrEqual(before)
  })
})
