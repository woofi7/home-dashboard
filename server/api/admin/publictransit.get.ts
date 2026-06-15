import { assertAuth } from '../../utils/adminAuth'
import { loadConfig } from '../../utils/config'

type BuspassConfig = { url: string }

export default defineEventHandler((event): BuspassConfig => {
  assertAuth(event)
  const settings = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  const cfg = (settings.publictransit as Partial<BuspassConfig> | undefined) ?? {}
  return { url: cfg.url ?? '' }
})
