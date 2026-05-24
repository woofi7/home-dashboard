import { assertAuth } from '../../utils/adminAuth'
import { loadConfig, writeConfig } from '../../utils/config'
import { weatherCache } from '../weather.get'

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const body = await readBody<Record<string, unknown>>(event)
  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  writeConfig('settings.yaml', { ...existing, weather: body })
  weatherCache.clear()
  return { ok: true }
})
