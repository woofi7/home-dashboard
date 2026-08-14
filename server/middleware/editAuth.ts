import { assertAuth } from '../utils/adminAuth'

// The dashboard is public-facing, so the whole app - not just edit/admin
// surfaces - requires an authenticated session. Only the routes needed to
// perform that authentication (and the container healthcheck) are exempt.
// Everything else, including GET /api/config and friends, would otherwise
// hand out service names, URLs, weather, calendar and widget data to anyone
// who finds the URL.
const PUBLIC_PREFIXES = ['/api/auth/', '/api/healthcheck']

export default defineEventHandler((event) => {
  const path = event.path ?? ''

  if (!path.startsWith('/api/'))
    return
  if (PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix)))
    return

  assertAuth(event)
})
