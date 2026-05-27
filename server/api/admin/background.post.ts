import { loadConfig, writeConfig } from '../../utils/config'
import { unsplashCache, pexelsCache, pixabayCache } from '../background.get'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  writeConfig('settings.yaml', { ...existing, background: body })
  unsplashCache.clear()
  pexelsCache.clear()
  pixabayCache.clear()
  return { ok: true }
})
