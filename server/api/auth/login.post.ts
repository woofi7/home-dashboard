import { timingSafeEqual, createHmac } from 'node:crypto'
import { getAdminToken, tokenConfigured, setAuthCookie } from '../../utils/adminAuth'

function safeEqual(a: string, b: string): boolean {
  const key = Buffer.from('hm_compare')
  const ha = createHmac('sha256', key).update(a).digest()
  const hb = createHmac('sha256', key).update(b).digest()
  return timingSafeEqual(ha, hb)
}

export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password: string }>(event)
  if (!tokenConfigured())
    throw createError({ statusCode: 400, message: 'No admin token configured' })

  const token = getAdminToken()
  if (!password || !safeEqual(password, token)) {
    console.warn(`[auth] Failed login attempt from ${getRequestIP(event) ?? 'unknown'}`)
    throw createError({ statusCode: 401, message: 'Wrong password' })
  }

  setAuthCookie(event)
  return { ok: true }
})
