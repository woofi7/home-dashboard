import { tokenConfigured, setAuthCookie } from '../../utils/adminAuth'
import { loadConfig, writeConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  if (tokenConfigured())
    throw createError({ statusCode: 403, message: 'Admin token already configured' })

  const { password } = await readBody<{ password: string }>(event)
  if (!password?.trim())
    throw createError({ statusCode: 400, message: 'Password is required' })

  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  writeConfig('settings.yaml', { ...existing, adminToken: password })

  setAuthCookie(event)
  return { ok: true }
})
