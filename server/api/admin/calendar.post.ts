import { loadConfigRaw, writeConfig } from '../../utils/config'
import { assertAuth } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const { clientId, clientSecret } = await readBody<{ clientId: string; clientSecret: string }>(event)

  const settings = (loadConfigRaw<Record<string, unknown>>('settings.yaml') ?? {}) as Record<string, unknown>
  const g = ((settings.google ?? {}) as Record<string, unknown>)
  g.clientId = clientId ?? ''
  g.clientSecret = clientSecret ?? ''
  settings.google = g
  writeConfig('settings.yaml', settings)

  return { ok: true }
})
