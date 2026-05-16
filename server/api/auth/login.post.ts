import { setAuthCookie } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password: string }>(event)
  const token = process.env.ADMIN_TOKEN
  if (!token) throw createError({ statusCode: 400, message: 'ADMIN_TOKEN not configured' })
  if (!password || password !== token) throw createError({ statusCode: 401, message: 'Wrong password' })
  setAuthCookie(event)
  return { ok: true }
})
