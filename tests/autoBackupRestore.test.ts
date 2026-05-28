import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    copyFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  }
})

vi.mock('../server/utils/config', () => ({
  getConfigDir: () => '/fake/config',
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
  const e = new Error(statusMessage)
  ;(e as { statusCode?: number }).statusCode = statusCode
  return e
})

import * as fs from 'node:fs'
import handler from '../server/api/admin/auto-backup-restore.post'

function makeEvent(body: Record<string, unknown>) {
  ;(readBody as ReturnType<typeof vi.fn>).mockResolvedValue(body)
  return {}
}

describe('POST /api/admin/auto-backup-restore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  it('copies backup file to config dir', async () => {
    makeEvent({ filename: 'services.yaml' })
    await (handler as (e: unknown) => Promise<unknown>)({})
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/fake/config/backup/services.yaml.bak',
      '/fake/config/services.yaml',
    )
  })

  it('returns ok and restored filename', async () => {
    makeEvent({ filename: 'settings.yaml' })
    const result = await (handler as (e: unknown) => Promise<{ ok: boolean; restored: string }>)({})
    expect(result.ok).toBe(true)
    expect(result.restored).toBe('settings.yaml')
  })

  it('throws 404 when backup file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    makeEvent({ filename: 'services.yaml' })
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('No backup found')
  })

  it('throws 400 for path traversal in filename', async () => {
    makeEvent({ filename: '../evil.yaml' })
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('Invalid filename')
  })

  it('throws 400 for disallowed file extension', async () => {
    makeEvent({ filename: 'evil.sh' })
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('Invalid file type')
  })

  it('throws 400 when filename is missing', async () => {
    makeEvent({})
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('Invalid filename')
  })
})
