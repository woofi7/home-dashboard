import { loadConfig } from '../utils/config'

type Settings = Record<string, unknown>
type ServiceGroup = { name: string; layout?: unknown; services: Record<string, unknown>[] }
type BookmarkGroup = { name: string; bookmarks: unknown[] }
type Widget = Record<string, unknown>

// Fields safe to expose to the browser — everything else (tokens, passwords, apiKeys…) is stripped
const SERVICE_SAFE_FIELDS = new Set(['name', 'url', 'icon', 'description', 'type', 'container'])

function sanitizeService(s: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(s).filter(([k]) => SERVICE_SAFE_FIELDS.has(k)))
}

// Recursively strip fields whose names suggest credentials
const CREDENTIAL_KEY = /key|secret|password|token/i

function stripCredentials(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(stripCredentials)
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([k]) => !CREDENTIAL_KEY.test(k))
      .map(([k, v]) => [k, stripCredentials(v)]),
  )
}

export default defineEventHandler(() => {
  const rawServices = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  const sanitizedServices = rawServices.map(g => ({
    name: g.name,
    layout: g.layout,
    services: g.services.map(sanitizeService),
  }))

  return {
    settings: stripCredentials(loadConfig<Settings>('settings.yaml') ?? {}),
    services: sanitizedServices,
    bookmarks: loadConfig<BookmarkGroup[]>('bookmarks.yaml') ?? [],
    widgets: loadConfig<Widget[]>('widgets.yaml') ?? [],
  }
})
