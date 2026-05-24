import { assertAuth } from '../../utils/adminAuth'
import { loadConfigRaw } from '../../utils/config'

export default defineEventHandler((event) => {
  assertAuth(event)
  const settings = loadConfigRaw<Record<string, unknown>>('settings.yaml') ?? {}
  return (settings.background ?? {}) as Record<string, unknown>
})
