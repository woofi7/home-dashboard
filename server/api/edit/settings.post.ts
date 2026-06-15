import { loadConfig, writeConfig } from '../../utils/config'

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function sanitize(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([k, v]) => {
      if (BLOCKED_KEYS.has(k) || k.startsWith('__'))
        return false
      if (k === 'adminToken' && (v === '' || v == null))
        return false
      return true
    })
  )
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const existing = loadConfig<Record<string, unknown>>('settings.yaml') ?? {}
  writeConfig('settings.yaml', { ...existing, ...sanitize(body) })
  return { ok: true }
})
