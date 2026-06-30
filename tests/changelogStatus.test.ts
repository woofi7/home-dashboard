import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLoadConfig = vi.fn()
const mockWriteConfig = vi.fn()
vi.mock('../server/utils/config', () => ({
  loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  writeConfig: (...args: unknown[]) => mockWriteConfig(...args),
}))

vi.stubGlobal('readBody', vi.fn())

import getHandler from '../server/api/changelog.get'
import dismissHandler from '../server/api/changelog/dismiss.post'

const readBody = vi.mocked(globalThis.readBody as (e: unknown) => Promise<unknown>)

beforeEach(() => {
  mockLoadConfig.mockReset()
  mockWriteConfig.mockReset()
  readBody.mockReset()
})

describe('GET /api/changelog', () => {
  it('returns null when no state file exists', () => {
    mockLoadConfig.mockReturnValue(null)
    expect((getHandler as Function)(null)).toEqual({ lastSeenVersion: null })
  })

  it('returns the stored lastSeenVersion', () => {
    mockLoadConfig.mockReturnValue({ lastSeenVersion: 'v1.3.1' })
    expect((getHandler as Function)(null)).toEqual({ lastSeenVersion: 'v1.3.1' })
  })
})

describe('POST /api/changelog/dismiss', () => {
  it('requires a version', async () => {
    readBody.mockResolvedValue({})
    await expect((dismissHandler as Function)({})).rejects.toThrow('400')
    expect(mockWriteConfig).not.toHaveBeenCalled()
  })

  it('writes the dismissed version', async () => {
    readBody.mockResolvedValue({ version: 'v1.3.1' })
    const result = await (dismissHandler as Function)({})
    expect(mockWriteConfig).toHaveBeenCalledWith('changelog.yaml', { lastSeenVersion: 'v1.3.1' })
    expect(result).toEqual({ ok: true })
  })
})
