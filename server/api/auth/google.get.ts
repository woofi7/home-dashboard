import { randomBytes } from 'node:crypto'
import { loadConfig } from '../../utils/config'
import { assertAuth } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  assertAuth(event)

  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const { clientId } = (settings?.google ?? {}) as Record<string, string | undefined>
  if (!clientId)
    throw createError({ statusCode: 400, message: 'Google client_id not configured' })

  const state = randomBytes(32).toString('hex')
  setCookie(event, 'hm_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  const origin = getRequestURL(event).origin
  const redirectUri = `${origin}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})
