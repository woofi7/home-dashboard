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

  it('allows GET /api/admin without auth (read-only)', () => {
    run('/api/admin/settings', 'GET')
    expect(mockAssertAuth).not.toHaveBeenCalled()
  })

  it('ignores unrelated paths', () => {
    run('/api/config', 'GET')
    run('/api/weather', 'POST')
    expect(mockAssertAuth).not.toHaveBeenCalled()
  })
})
