// In-memory brute-force throttle for the single shared admin password.
// Keyed by client IP. State is per-process, which is appropriate for a
// single-instance self-hosted app; it resets on restart (fail-open, but the
// password is constant-time compared and high-entropy when set sensibly).

type Entry = { failures: number; blockedUntil: number; lastSeen: number }

const store = new Map<string, Entry>()

const FREE_ATTEMPTS = 5 // allowed failures before lockout kicks in
const WINDOW_MS = 15 * 60 * 1000 // idle period after which the counter resets
const BASE_LOCK_MS = 30 * 1000 // first lockout duration
const MAX_LOCK_MS = 15 * 60 * 1000 // cap on exponential backoff

export function rateLimitStatus(ip: string, now: number = Date.now()): { allowed: boolean; retryAfterSeconds?: number } {
  const e = store.get(ip)
  if (e && e.blockedUntil > now)
    return { allowed: false, retryAfterSeconds: Math.ceil((e.blockedUntil - now) / 1000) }
  return { allowed: true }
}

export function recordFailure(ip: string, now: number = Date.now()): void {
  let e = store.get(ip)
  if (!e || now - e.lastSeen > WINDOW_MS)
    e = { failures: 0, blockedUntil: 0, lastSeen: now }

  e.failures += 1
  e.lastSeen = now

  if (e.failures > FREE_ATTEMPTS) {
    const over = e.failures - FREE_ATTEMPTS
    e.blockedUntil = now + Math.min(BASE_LOCK_MS * 2 ** (over - 1), MAX_LOCK_MS)
  }

  store.set(ip, e)
}

export function recordSuccess(ip: string): void {
  store.delete(ip)
}

// Test helper: clear all throttle state.
export function _resetRateLimit(): void {
  store.clear()
}
