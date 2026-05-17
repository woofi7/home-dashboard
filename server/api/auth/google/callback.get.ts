import { loadConfig, writeConfig } from '#server/utils/config'

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as Record<string, string>
  if (!code)
    throw createError({ statusCode: 400, message: 'Missing code' })

  const settings = loadConfig<Record<string, unknown>>('settings.yaml')!
  const { clientId, clientSecret } = (settings.google ?? {}) as Record<string, string | undefined>
  if (!clientId || !clientSecret)
    throw createError({ statusCode: 400, message: 'Google credentials not configured' })

  const origin = getRequestURL(event).origin
  const redirectUri = `${origin}/api/auth/google/callback`

  const res = await $fetch<{ refresh_token?: string; error?: string }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
  })

  if (!res.refresh_token)
    throw createError({ statusCode: 400, message: `Google OAuth error: ${res.error ?? 'no refresh_token'}` })

  ;(settings.google as Record<string, string>).refreshToken = res.refresh_token
  writeConfig('settings.yaml', settings)

  return sendRedirect(event, '/')
})
