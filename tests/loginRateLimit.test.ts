import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimitStatus, recordFailure, recordSuccess, _resetRateLimit } from '../server/utils/loginRateLimit'

const IP = '203.0.113.5'
const t0 = 1_000_000

beforeEach(() => _resetRateLimit())

describe('login rate limit', () => {
  it('allows the first failures without locking out', () => {
    for (let i = 0; i < 5; i++) recordFailure(IP, t0)
    expect(rateLimitStatus(IP, t0).allowed).toBe(true)
  })

  it('locks out after exceeding the free attempts', () => {
    for (let i = 0; i < 6; i++) recordFailure(IP, t0)
    const status = rateLimitStatus(IP, t0)
    expect(status.allowed).toBe(false)
    expect(status.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('backs off exponentially on further failures', () => {
    for (let i = 0; i < 6; i++) recordFailure(IP, t0)
    const first = rateLimitStatus(IP, t0).retryAfterSeconds!
    recordFailure(IP, t0)
    const second = rateLimitStatus(IP, t0).retryAfterSeconds!
    expect(second).toBeGreaterThan(first)
  })

  it('allows again once the lockout window passes', () => {
    for (let i = 0; i < 6; i++) recordFailure(IP, t0)
    const wait = rateLimitStatus(IP, t0).retryAfterSeconds! * 1000
    expect(rateLimitStatus(IP, t0 + wait + 1).allowed).toBe(true)
  })

  it('a successful login clears the counter', () => {
    for (let i = 0; i < 6; i++) recordFailure(IP, t0)
    recordSuccess(IP)
    expect(rateLimitStatus(IP, t0).allowed).toBe(true)
  })

  it('does not penalise a different IP', () => {
    for (let i = 0; i < 10; i++) recordFailure(IP, t0)
    expect(rateLimitStatus('198.51.100.9', t0).allowed).toBe(true)
  })

  it('resets the counter after a long idle period', () => {
    for (let i = 0; i < 5; i++) recordFailure(IP, t0)
    // 16 minutes later, a new failure starts a fresh window (no immediate lock)
    recordFailure(IP, t0 + 16 * 60 * 1000)
    expect(rateLimitStatus(IP, t0 + 16 * 60 * 1000).allowed).toBe(true)
  })
})
