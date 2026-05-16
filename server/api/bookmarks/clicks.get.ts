import { loadConfig } from '../../utils/config'

export default defineEventHandler(() => {
  return loadConfig<Record<string, number>>('bookmark-clicks.yaml') ?? {}
})
