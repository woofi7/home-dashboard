import { assertAuth } from '../../utils/adminAuth'
import { loadConfig, writeConfig } from '../../utils/config'

const ALLOWED_WIDGETS = new Set(['calendar', 'weather', 'publictransit'])

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const body = await readBody<{ widget: string; enabled: boolean }>(event)
  if (!ALLOWED_WIDGETS.has(body.widget))
    throw createError({ statusCode: 400, message: 'Invalid widget name' })
  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  const widgetCfg = (existing[body.widget] as Record<string, unknown> | undefined) ?? {}
  writeConfig('settings.yaml', {
    ...existing,
    [body.widget]: { ...widgetCfg, enabled: body.enabled },
  })
  return { ok: true }
})
