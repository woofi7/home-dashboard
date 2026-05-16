import { assertAuth } from '../utils/adminAuth'

export default defineEventHandler((event) => {
  const path = event.path ?? ''
  const method = event.method

  // Protect all edit routes (GET included — they return raw credentials)
  if (path.startsWith('/api/edit')) {
    assertAuth(event)
    return
  }

  // Protect write operations on admin routes
  if (path.startsWith('/api/admin') && method !== 'GET') {
    assertAuth(event)
  }
})
