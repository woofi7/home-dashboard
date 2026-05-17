import { assertAuth } from '../utils/adminAuth'

export default defineEventHandler((event) => {
  const path = event.path ?? ''
  const method = event.method

  if (path.startsWith('/api/edit')) {
    assertAuth(event)
    return
  }

  if (path.startsWith('/api/admin') && method !== 'GET') {
    assertAuth(event)
  }
})
