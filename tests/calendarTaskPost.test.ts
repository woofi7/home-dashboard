import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../server/utils/googleToken', () => ({
  getGoogleCreds: vi.fn(),
  getGoogleAccessToken: vi.fn(),
}))

const { mockAssertAuth } = vi.hoisted(() => ({ mockAssertAuth: vi.fn() }))
vi.mock('../server/utils/adminAuth', () => ({ assertAuth: mockAssertAuth }))

vi.stubGlobal('readBody', vi.fn())
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

import { getGoogleCreds, getGoogleAccessToken } from '../server/utils/googleToken'
import handler from '../server/api/calendar/task.post'

const creds = vi.mocked(getGoogleCreds)
const token = vi.mocked(getGoogleAccessToken)
const readBody = vi.mocked(globalThis.readBody as (e: unknown) => Promise<unknown>)

beforeEach(() => {
  mockFetch.mockReset()
  creds.mockReset()
  token.mockReset()
  readBody.mockReset()
  mockAssertAuth.mockReset()
})

function run() {
  return (handler as (e: unknown) => Promise<unknown>)({})
}

describe('POST /api/calendar/task', () => {
  it('requires authentication', async () => {
    mockAssertAuth.mockImplementation(() => { throw new Error('401: Unauthorized') })
    readBody.mockResolvedValue({ listId: 'l1', taskId: 't1' })
    await expect(run()).rejects.toThrow('401')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('PATCHes the task to completed', async () => {
    readBody.mockResolvedValue({ listId: 'l1', taskId: 't1' })
    creds.mockReturnValue({ clientId: 'c', clientSecret: 's', refreshToken: 'r' })
    token.mockResolvedValue('tok')
    mockFetch.mockResolvedValue({})
    const res = await run()
    expect(res).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/tasks/v1/lists/l1/tasks/t1',
      expect.objectContaining({ method: 'PATCH', body: { status: 'completed' } }),
    )
  })

  it('requires listId and taskId', async () => {
    readBody.mockResolvedValue({ listId: 'l1' })
    await expect(run()).rejects.toThrow('400')
  })

  it('errors when the Google account is not connected', async () => {
    readBody.mockResolvedValue({ listId: 'l1', taskId: 't1' })
    creds.mockReturnValue(null)
    await expect(run()).rejects.toThrow('400')
  })

  it('maps a 403 to a reconnect message', async () => {
    readBody.mockResolvedValue({ listId: 'l1', taskId: 't1' })
    creds.mockReturnValue({ clientId: 'c', clientSecret: 's', refreshToken: 'r' })
    token.mockResolvedValue('tok')
    mockFetch.mockRejectedValue({ response: { status: 403 } })
    await expect(run()).rejects.toThrow('Reconnect')
  })
})
