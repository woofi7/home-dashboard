import { loadConfig } from '../utils/config'

export default defineEventHandler(() => {
  const state = loadConfig<{ lastSeenVersion?: string }>('changelog.yaml')
  return { lastSeenVersion: state?.lastSeenVersion ?? null }
})
