import { loadConfigRaw } from '../../utils/config'
import { assertAuth } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  assertAuth(event)
  const settings = loadConfigRaw<Record<string, unknown>>('settings.yaml')
  const g = (settings?.google ?? {}) as Record<string, string | undefined>
  return {
    clientId:        g.clientId        ?? '',
    clientSecret:    g.clientSecret    ?? '',
    hasRefreshToken: !!g.refreshToken,
  }
})
