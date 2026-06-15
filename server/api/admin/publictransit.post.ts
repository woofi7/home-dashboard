import { assertAuth } from '../../utils/adminAuth'
import { loadConfig, writeConfig } from '../../utils/config'
import { publictransitCache } from '../publictransit.get'

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const body = await readBody<{ url: string }>(event)
  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  writeConfig('settings.yaml', { ...existing, publictransit: { url: body.url } })
  publictransitCache.clear()
  return { ok: true }
})
