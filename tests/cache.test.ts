import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCache } from '../server/utils/cache'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('createCache', () => {
  it('returns null before any value is set', () => {
    const c = createCache<number>()
    expect(c.get(1000)).toBeNull()
  })

  it('returns the value after set', () => {
    const c = createCache<number>()
    c.set(42)
    expect(c.get(1000)).toBe(42)
  })

  it('returns null after TTL expires', () => {
    const c = createCache<number>()
    c.set(42)
    vi.advanceTimersByTime(1001)
    expect(c.get(1000)).toBeNull()
  })

  it('never expires when TTL is Infinity', () => {
    const c = createCache<string>()
    c.set('hello')
    vi.advanceTimersByTime(999_999_999)
    expect(c.get(Infinity)).toBe('hello')
  })

  it('clear() invalidates cached value', () => {
    const c = createCache<number>()
    c.set(1)
    c.clear()
    expect(c.get(1000)).toBeNull()
  })

  it('set() returns the stored value', () => {
    const c = createCache<string>()
    expect(c.set('hi')).toBe('hi')
  })

  it('fetch() calls fn and caches the result', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(99)
    const result = await c.fetch(1000, fn)
    expect(result).toBe(99)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fetch() returns cache hit without calling fn', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(99)
    await c.fetch(1000, fn)
    const second = await c.fetch(1000, fn)
    expect(second).toBe(99)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fetch() re-calls fn after TTL expires', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(1)
    await c.fetch(1000, fn)
    vi.advanceTimersByTime(1001)
    await c.fetch(1000, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('fetch() deduplicates concurrent calls (thundering herd)', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(7)
    const [a, b, d] = await Promise.all([c.fetch(1000, fn), c.fetch(1000, fn), c.fetch(1000, fn)])
    expect(fn).toHaveBeenCalledOnce()
    expect(a).toBe(7)
    expect(b).toBe(7)
    expect(d).toBe(7)
  })

  it('fetch() with force=true bypasses cache and re-fetches', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(5)
    await c.fetch(1000, fn)
    await c.fetch(1000, fn, true)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
