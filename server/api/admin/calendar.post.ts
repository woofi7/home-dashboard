import { loadConfigRaw, writeConfig } from '../../utils/config'
import { assertAuth } from '../../utils/adminAuth'

type Body = {
  clientId?: string
  clientSecret?: string
  showEvents?: boolean
  showTasks?: boolean
  daysAhead?: number
  taskMode?: string
}

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const body = await readBody<Body>(event)

  const settings = (loadConfigRaw<Record<string, unknown>>('settings.yaml') ?? {}) as Record<string, unknown>
  const g = ((settings.google ?? {}) as Record<string, unknown>)

  if (body.clientId !== undefined) g.clientId = body.clientId
  if (body.clientSecret) g.clientSecret = body.clientSecret

  if (body.showEvents !== undefined || body.showTasks !== undefined || body.daysAhead !== undefined || body.taskMode !== undefined) {
    const cal = ((g.calendar ?? {}) as Record<string, unknown>)
    if (body.showEvents !== undefined) cal.showEvents = body.showEvents
    if (body.showTasks !== undefined) cal.showTasks = body.showTasks
    if (body.daysAhead !== undefined) cal.daysAhead = body.daysAhead
    if (body.taskMode !== undefined) cal.taskMode = body.taskMode
    g.calendar = cal
  }

  settings.google = g
  writeConfig('settings.yaml', settings)

  return { ok: true }
})
