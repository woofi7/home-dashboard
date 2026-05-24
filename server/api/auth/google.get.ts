import { loadConfig } from '../../utils/config'

export default defineEventHandler((event) => {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const { clientId } = (settings?.google ?? {}) as Record<string, string | undefined>
  if (!clientId)
    throw createError({ statusCode: 400, message: 'Google client_id not configured' })

  const origin = getRequestURL(event).origin
  const redirectUri = `${origin}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})
