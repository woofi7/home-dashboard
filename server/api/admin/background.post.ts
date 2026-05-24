import { loadConfig, writeConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  writeConfig('settings.yaml', { ...existing, background: body })
  return { ok: true }
})
