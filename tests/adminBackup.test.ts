import { describe, it, expect, vi, beforeEach } from 'vitest'
import { unzipSync } from 'fflate'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    readdirSync: vi.fn().mockReturnValue([
      { name: 'services.yaml', isDirectory: () => false },
      { name: 'bookmarks.yaml', isDirectory: () => false },
      { name: 'settings.yaml', isDirectory: () => false },
      { name: 'backup', isDirectory: () => true },
      { name: 'tmp', isDirectory: () => true },
      { name: 'image.png', isDirectory: () => false },
    ]),
    readFileSync: vi.fn((path: string) => {
      if (path.endsWith('services.yaml')) return '- name: Media\n  services: []'
      if (path.endsWith('bookmarks.yaml')) return '- name: Links\n  bookmarks: []'
      if (path.endsWith('settings.yaml')) return 'title: Home'
      return ''
    }),
  }
})

vi.mock('../server/utils/config', () => ({
  getConfigDir: () => '/fake/config',
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)
vi.stubGlobal('createError', ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
  const e = new Error(statusMessage)
  ;(e as { statusCode?: number }).statusCode = statusCode
  return e
})
vi.stubGlobal('setHeader', vi.fn())

import handler from '../server/api/admin/backup.get'

describe('GET /api/admin/backup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a Uint8Array (zip binary)', async () => {
    const result = await (handler as (e: unknown) => Promise<unknown>)({})
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('zip contains services.yaml and bookmarks.yaml', async () => {
    const result = await (handler as (e: unknown) => Promise<Uint8Array>)({})
    const files = unzipSync(result)
    expect(Object.keys(files)).toContain('services.yaml')
    expect(Object.keys(files)).toContain('bookmarks.yaml')
    expect(Object.keys(files)).toContain('settings.yaml')
  })

  it('zip does not include the backup directory', async () => {
    const result = await (handler as (e: unknown) => Promise<Uint8Array>)({})
    const files = unzipSync(result)
    expect(Object.keys(files).some(k => k === 'backup' || k.startsWith('backup/'))).toBe(false)
  })

  it('zip does not include non-config files (e.g. image.png)', async () => {
    const result = await (handler as (e: unknown) => Promise<Uint8Array>)({})
    const files = unzipSync(result)
    expect(Object.keys(files)).not.toContain('image.png')
  })

  it('zip file content matches source', async () => {
    const result = await (handler as (e: unknown) => Promise<Uint8Array>)({})
    const files = unzipSync(result)
    const content = new TextDecoder().decode(files['services.yaml'])
    expect(content).toContain('Media')
  })

  it('sets Content-Type to application/zip', async () => {
    await (handler as (e: unknown) => Promise<unknown>)({})
    expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'Content-Type', 'application/zip')
  })

  it('sets Content-Disposition with a timestamped filename', async () => {
    await (handler as (e: unknown) => Promise<unknown>)({})
    const call = (setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      ([, key]: [unknown, string]) => key === 'Content-Disposition',
    )
    expect(call?.[2]).toMatch(/attachment; filename="homepage-backup-\d{4}-\d{2}-\d{2}/)
  })
})
