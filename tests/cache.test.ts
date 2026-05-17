import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCache } from '../server/utils/cache'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('createCache', () => {
  it('returns null before any value is set', () => {
    const c = createCache<number>()
    expect(c.get()).toBeNull()
  })

  it('returns the value after set', () => {
    const c = createCache<number>()
    c.set(42, 1000)
    expect(c.get()).toBe(42)
  })

  it('returns null after TTL expires', () => {
    const c = createCache<number>()
    c.set(42, 1000)
    vi.advanceTimersByTime(1001)
    expect(c.get()).toBeNull()
  })

  it('never expires when TTL is Infinity', () => {
    const c = createCache<string>()
    c.set('hello', Infinity)
    vi.advanceTimersByTime(999_999_999)
    expect(c.get()).toBe('hello')
  })

  it('clear() invalidates cached value', () => {
    const c = createCache<number>()
    c.set(1, 1000)
    c.clear()
    expect(c.get()).toBeNull()
  })

  it('set() returns the stored value', () => {
    const c = createCache<string>()
    expect(c.set('hi', 1000)).toBe('hi')
  })

  it('fetch() calls fn and caches the result', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(99)
    const result = await c.fetch(fn, 1000)
    expect(result).toBe(99)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fetch() returns cache hit without calling fn', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(99)
    await c.fetch(fn, 1000)
    const second = await c.fetch(fn, 1000)
    expect(second).toBe(99)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('fetch() re-calls fn after TTL expires', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(1)
    await c.fetch(fn, 1000)
    vi.advanceTimersByTime(1001)
    await c.fetch(fn, 1000)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('fetch() deduplicates concurrent calls (thundering herd)', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(7)
    const [a, b, d] = await Promise.all([c.fetch(fn, 1000), c.fetch(fn, 1000), c.fetch(fn, 1000)])
    expect(fn).toHaveBeenCalledOnce()
    expect(a).toBe(7)
    expect(b).toBe(7)
    expect(d).toBe(7)
  })

  it('fetch() with force=true bypasses cache and re-fetches', async () => {
    const c = createCache<number>()
    const fn = vi.fn().mockResolvedValue(5)
    await c.fetch(fn, 1000)
    await c.fetch(fn, 1000, true)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
