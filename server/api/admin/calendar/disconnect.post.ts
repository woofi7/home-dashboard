import { loadConfigRaw, writeConfig } from '../../../utils/config'
import { assertAuth } from '../../../utils/adminAuth'

export default defineEventHandler((event) => {
  assertAuth(event)
  const settings = (loadConfigRaw<Record<string, unknown>>('settings.yaml') ?? {}) as Record<string, unknown>
  const g = ((settings.google ?? {}) as Record<string, unknown>)
  delete g.refreshToken
  settings.google = g
  writeConfig('settings.yaml', settings)
  return { ok: true }
})
