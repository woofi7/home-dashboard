import { assertAuth } from '../../utils/adminAuth'
import { loadConfig } from '../../utils/config'

export default defineEventHandler((event) => {
  assertAuth(event)
  const settings = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  function isEnabled(key: string) {
    const w = settings[key] as { enabled?: boolean } | undefined
    return w?.enabled !== false
  }
  return {
    calendar: isEnabled('calendar'),
    weather: isEnabled('weather'),
    publictransit: isEnabled('publictransit'),
  }
})
