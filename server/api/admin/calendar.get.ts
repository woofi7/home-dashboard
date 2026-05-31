import { loadConfigRaw } from '../../utils/config'
import { assertAuth } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  assertAuth(event)
  const settings = loadConfigRaw<Record<string, unknown>>('settings.yaml')
  const g = (settings?.google ?? {}) as Record<string, unknown>
  const cal = (g.calendar ?? {}) as Record<string, unknown>
  return {
    clientId:        (g.clientId        as string) ?? '',
    clientSecret:    (g.clientSecret    as string) ?? '',
    hasRefreshToken: !!(g.refreshToken),
    showEvents: (cal.showEvents as boolean) ?? true,
    showTasks:  (cal.showTasks  as boolean) ?? false,
    daysAhead:  (cal.daysAhead  as number)  ?? 2,
    taskMode:   (cal.taskMode   as string)  ?? 'all',
  }
})
