import { loadConfig } from './config'
import { createCache } from './cache'

export type GoogleCreds = { clientId: string; clientSecret: string; refreshToken: string }

const tokenCache = createCache<string>()

export function getGoogleCreds(): GoogleCreds | null {
  const settings = loadConfig<Record<string, unknown>>('settings.yaml')
  const g = (settings?.google ?? {}) as Record<string, string>
  const { clientId, clientSecret, refreshToken } = g
  if (!clientId || !clientSecret || !refreshToken)
    return null
  return { clientId, clientSecret, refreshToken }
}

export async function getGoogleAccessToken(creds: GoogleCreds): Promise<string> {
  const hit = tokenCache.get()
  if (hit)
    return hit

  const res = await $fetch<{ access_token: string; expires_in: number }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret, refresh_token: creds.refreshToken, grant_type: 'refresh_token' }).toString(),
  })

  return tokenCache.set(res.access_token, (res.expires_in - 60) * 1000)
}

export function clearGoogleToken() {
  tokenCache.clear()
}
