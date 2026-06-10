import { timingSafeEqual, createHmac } from 'node:crypto'
import { getAdminToken, tokenConfigured, setAuthCookie } from '../../utils/adminAuth'
import { rateLimitStatus, recordFailure, recordSuccess } from '../../utils/loginRateLimit'

function safeEqual(a: string, b: string): boolean {
  const key = Buffer.from('hm_compare')
  const ha = createHmac('sha256', key).update(a).digest()
  const hb = createHmac('sha256', key).update(b).digest()
  return timingSafeEqual(ha, hb)
}

export default defineEventHandler(async (event) => {
  // Use the socket peer IP (not X-Forwarded-For, which a direct client can
  // spoof to evade the throttle).
  const ip = getRequestIP(event) ?? 'unknown'

  const limit = rateLimitStatus(ip)
  if (!limit.allowed) {
    setResponseHeader(event, 'Retry-After', String(limit.retryAfterSeconds ?? 60))
    throw createError({ statusCode: 429, message: 'Too many failed attempts. Try again later.' })
  }

  const { password } = await readBody<{ password: string }>(event)
  if (!tokenConfigured())
    throw createError({ statusCode: 400, message: 'No admin token configured' })

  const token = getAdminToken()
  if (!password || !safeEqual(password, token)) {
    recordFailure(ip)
    console.warn(`[auth] Failed login attempt from ${ip}`)
    throw createError({ statusCode: 401, message: 'Wrong password' })
  }

  recordSuccess(ip)
  setAuthCookie(event)
  return { ok: true }
})
