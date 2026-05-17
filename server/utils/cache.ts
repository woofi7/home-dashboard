export type Cache<T> = {
  get(): T | null
  set(data: T, ttl: number): T
  clear(): void
  // Return the cached value if still valid, otherwise call fn() and cache the result
  fetch(fn: () => Promise<T>, ttl: number, force?: boolean): Promise<T>
}

export function createCache<T>(): Cache<T> {
  let entry: { data: T; expiresAt: number } | null = null
  let inflight: Promise<T> | null = null

  return {
    get() {
      if (entry && Date.now() < entry.expiresAt) return entry.data
      return null
    },
    set(data, ttl) {
      entry = { data, expiresAt: Date.now() + ttl }
      return data
    },
    clear() {
      entry = null
      inflight = null
    },
    fetch(fn, ttl, force = false) {
      if (!force) {
        const hit = this.get()
        if (hit !== null) return Promise.resolve(hit)
        if (inflight) return inflight
      }
      inflight = fn()
        .then(data => this.set(data, ttl))
        .finally(() => { inflight = null })
      return inflight
    },
  }
}
