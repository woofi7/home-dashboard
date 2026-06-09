import { loadConfig } from '../../utils/config'
import { tokenConfigured } from '../../utils/adminAuth'

const CREDENTIAL_KEY = /key|secret|password|token/i

function stripCredentials(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object')
    return obj
  if (Array.isArray(obj))
    return obj.map(stripCredentials)
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([k]) => !CREDENTIAL_KEY.test(k))
      .map(([k, v]) => [k, stripCredentials(v)])
  )
}

export default defineEventHandler(() => {
  const config = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  // Never return the admin token to the client. stripCredentials already
  // removes it; we expose only whether one is configured so the settings form
  // can show a "set / not set" state and leave the stored token untouched
  // unless the admin deliberately types a new one.
  return { ...stripCredentials(config), adminTokenSet: tokenConfigured() }
})
