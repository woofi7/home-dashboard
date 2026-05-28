import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: vi.fn().mockReturnValue('- name: Media\n  services: []\n'),
    existsSync: vi.fn().mockReturnValue(true),
  }
})

vi.mock('../server/utils/config', () => ({
  getConfigDir: () => '/fake/config',
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('getQuery', vi.fn())
vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
  const e = new Error(statusMessage)
  ;(e as { statusCode?: number }).statusCode = statusCode
  return e
})

import * as fs from 'node:fs'
import handler from '../server/api/admin/auto-backup-preview.get'

function makeEvent(filename: string | undefined) {
  ;(getQuery as ReturnType<typeof vi.fn>).mockReturnValue({ filename })
  return {}
}

describe('GET /api/admin/auto-backup-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('- name: Media\n  services: []\n')
  })

  it('returns content of the backup file', async () => {
    makeEvent('services.yaml')
    const result = await (handler as (e: unknown) => Promise<{ content: string }>)({})
    expect(result.content).toContain('Media')
  })

  it('reads from the backup subdirectory', async () => {
    makeEvent('services.yaml')
    await (handler as (e: unknown) => Promise<unknown>)({})
    const [path] = vi.mocked(fs.readFileSync).mock.calls[0] as [string]
    expect(path).toBe('/fake/config/backup/services.yaml.bak')
  })

  it('throws 404 when backup file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    makeEvent('services.yaml')
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('No backup found')
  })

  it('throws 400 for path traversal', async () => {
    makeEvent('../evil.yaml')
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('Invalid filename')
  })

  it('throws 400 for disallowed extension', async () => {
    makeEvent('script.sh')
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('Invalid file type')
  })

  it('throws 400 when filename is missing', async () => {
    makeEvent(undefined)
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('Invalid filename')
  })
})
