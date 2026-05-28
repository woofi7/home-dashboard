import { describe, it, expect, vi, beforeEach } from 'vitest'

const MOCK_MTIME_ISO = '2026-05-28T10:00:00.000Z'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    readdirSync: vi.fn().mockReturnValue([
      { name: 'services.yaml.bak', isDirectory: () => false },
      { name: 'bookmarks.yaml.bak', isDirectory: () => false },
      { name: 'somefile.txt', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true },
    ]),
    statSync: vi.fn().mockReturnValue({ mtime: new Date('2026-05-28T10:00:00Z'), size: 512 }),
  }
})

vi.mock('../server/utils/config', () => ({
  getConfigDir: () => '/fake/config',
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

import handler from '../server/api/admin/auto-backups.get'

describe('GET /api/admin/auto-backups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns files array', async () => {
    const result = await (handler as () => Promise<{ files: unknown[] }>)()
    expect(Array.isArray(result.files)).toBe(true)
  })

  it('lists .bak files with name stripped of .bak extension', async () => {
    const result = await (handler as () => Promise<{ files: { name: string }[] }>)()
    const names = result.files.map(f => f.name)
    expect(names).toContain('services.yaml')
    expect(names).toContain('bookmarks.yaml')
  })

  it('excludes non-.bak files', async () => {
    const result = await (handler as () => Promise<{ files: { name: string }[] }>)()
    const names = result.files.map(f => f.name)
    expect(names).not.toContain('somefile.txt')
  })

  it('excludes subdirectories', async () => {
    const result = await (handler as () => Promise<{ files: { name: string }[] }>)()
    const names = result.files.map(f => f.name)
    expect(names).not.toContain('subdir')
  })

  it('includes modified date and size', async () => {
    const result = await (handler as () => Promise<{ files: { name: string; modified: string; size: number }[] }>)()
    const file = result.files[0]!
    expect(file.modified).toBe(MOCK_MTIME_ISO)
    expect(file.size).toBe(512)
  })

  it('returns empty files array when backup dir does not exist', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValueOnce(false)
    const result = await (handler as () => Promise<{ files: unknown[] }>)()
    expect(result.files).toHaveLength(0)
  })

  it('sorts files alphabetically by name', async () => {
    const result = await (handler as () => Promise<{ files: { name: string }[] }>)()
    const names = result.files.map(f => f.name)
    expect(names).toEqual([...names].sort())
  })
})
