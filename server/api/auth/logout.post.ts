import { clearAuthCookie } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  clearAuthCookie(event)
  return { ok: true }
})
