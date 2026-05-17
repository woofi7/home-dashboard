export type Cache<T> = {
  /** Return cached value if within TTL, null otherwise. Pass Infinity to never expire. */
  get(ttl: number): T | null
  /** Store a value and return it. */
  set(data: T): T
  /** Invalidate the cache. */
  clear(): void
  /**
   * Return the cached value if still valid, otherwise call fn() and cache the result.
   * Concurrent calls while fn() is in flight share the same promise (thundering-herd guard).
   * Pass force=true to bypass the cache and always re-fetch.
   */
  fetch(ttl: number, fn: () => Promise<T>, force?: boolean): Promise<T>
}

export function createCache<T>(): Cache<T> {
  let entry: { data: T; at: number } | null = null
  let inflight: Promise<T> | null = null

  return {
    get(ttl) {
      if (entry && Date.now() - entry.at < ttl) return entry.data
      return null
    },
    set(data) {
      entry = { data, at: Date.now() }
      return data
    },
    clear() {
      entry = null
      inflight = null
    },
    fetch(ttl, fn, force = false) {
      if (!force) {
        const hit = this.get(ttl)
        if (hit !== null) return Promise.resolve(hit)
        if (inflight) return inflight
      }
      inflight = fn()
        .then(data => this.set(data))
        .finally(() => { inflight = null })
      return inflight
    },
  }
}
