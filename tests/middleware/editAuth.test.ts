import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAssertAuth } = vi.hoisted(() => ({ mockAssertAuth: vi.fn() }))
vi.mock('../../server/utils/adminAuth', () => ({ assertAuth: mockAssertAuth }))

import handler from '../../server/middleware/editAuth'

function run(path: string, method = 'GET') {
  return (handler as Function)({ path, method })
}

beforeEach(() => {
  mockAssertAuth.mockReset()
})

describe('editAuth middleware', () => {
  it('requires auth for /api/edit on any method', () => {
    run('/api/edit/services', 'POST')
    run('/api/edit/bookmarks', 'GET')
    expect(mockAssertAuth).toHaveBeenCalledTimes(2)
  })

  it('requires auth for mutating /api/admin requests', () => {
    run('/api/admin/settings', 'POST')
    run('/api/admin/docker', 'DELETE')
    expect(mockAssertAuth).toHaveBeenCalledTimes(2)
  })

  it('requires auth for GET /api/admin too (config/secrets must not leak)', () => {
    run('/api/admin/settings', 'GET')
    run('/api/admin/backup', 'GET')
    expect(mockAssertAuth).toHaveBeenCalledTimes(2)
  })

  it('requires auth for the rest of the public dashboard data too', () => {
    run('/api/config', 'GET')
    run('/api/weather', 'POST')
    run('/api/refresh', 'GET')
    run('/api/widget/sonarr', 'GET')
    run('/api/calendar', 'GET')
    run('/api/background', 'GET')
    expect(mockAssertAuth).toHaveBeenCalledTimes(6)
  })

  it('ignores non-API paths', () => {
    run('/admin', 'GET')
    run('/', 'GET')
    expect(mockAssertAuth).not.toHaveBeenCalled()
  })

  it('exempts auth and healthcheck routes', () => {
    run('/api/auth/status', 'GET')
    run('/api/auth/login', 'POST')
    run('/api/auth/setup', 'POST')
    run('/api/auth/logout', 'POST')
    run('/api/healthcheck', 'GET')
    expect(mockAssertAuth).not.toHaveBeenCalled()
  })
})
