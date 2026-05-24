import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockWriteConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: vi.fn(),
  writeConfig: (...args: unknown[]) => mockWriteConfig(...args),
}))

vi.mock('../server/utils/adminAuth', () => ({
  assertAuth: vi.fn(),
}))

import deleteHandler from '../server/api/admin/bookmark-clicks.delete'

beforeEach(() => {
  mockWriteConfig.mockReset()
})

describe('DELETE /api/admin/bookmark-clicks', () => {
  it('writes an empty object to bookmark-clicks.yaml', async () => {
    await (deleteHandler as Function)(null)
    expect(mockWriteConfig).toHaveBeenCalledWith('bookmark-clicks.yaml', {})
  })

  it('returns { ok: true }', async () => {
    const result = await (deleteHandler as Function)(null)
    expect(result).toEqual({ ok: true })
  })
})
