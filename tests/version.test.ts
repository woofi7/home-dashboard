import { describe, it, expect, vi, beforeEach } from 'vitest'

const execSyncMock = vi.fn()
vi.mock('node:child_process', () => ({ execSync: (...a: unknown[]) => execSyncMock(...a) }))

import { getVersion } from '../server/utils/version'

describe('getVersion', () => {
  beforeEach(() => execSyncMock.mockReset())

  it('returns the trimmed git tag', () => {
    execSyncMock.mockReturnValueOnce('v1.2.3\n')
    expect(getVersion()).toBe('v1.2.3')
  })

  it('returns dev when git command fails', () => {
    execSyncMock.mockImplementationOnce(() => { throw new Error('not a git repo') })
    expect(getVersion()).toBe('dev')
  })

  it('trims whitespace from tag output', () => {
    execSyncMock.mockReturnValueOnce('  v2.0.0  \n')
    expect(getVersion()).toBe('v2.0.0')
  })

  it('passes the correct git command', () => {
    execSyncMock.mockReturnValueOnce('v1.0.0')
    getVersion()
    expect(execSyncMock).toHaveBeenCalledWith('git describe --tags --abbrev=0', { encoding: 'utf-8' })
  })
})
