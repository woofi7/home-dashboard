import { loadConfig } from '../../utils/config'

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
  return stripCredentials(loadConfig<Record<string, unknown>>('settings.yaml') ?? {})
})
