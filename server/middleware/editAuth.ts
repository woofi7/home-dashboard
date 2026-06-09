import { assertAuth } from '../utils/adminAuth'

// Every admin and edit surface requires an authenticated session — for ALL
// methods, including GET. Previously GET /api/admin/* was left open, which
// leaked the full config (admin token, API keys, Docker topology, backups).
// The public dashboard never needs /api/admin/*; its read-only data comes from
// unauthenticated endpoints (/api/config, /api/refresh, /api/widget/*,
// /api/background, /api/weather, /api/calendar).
export default defineEventHandler((event) => {
  const path = event.path ?? ''

  if (path.startsWith('/api/edit') || path.startsWith('/api/admin'))
    assertAuth(event)
})
