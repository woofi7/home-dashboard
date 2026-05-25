import { describe, it, expect, vi, beforeEach } from 'vitest'
import { zipSync, strToU8 } from 'fflate'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    writeFileSync: vi.fn(),
    copyFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
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
vi.stubGlobal('readFormData', vi.fn())

import * as fs from 'node:fs'
import handler from '../server/api/admin/restore.post'

function makeZip(files: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const [name, content] of Object.entries(files)) {
    entries[name] = strToU8(content)
  }
  return zipSync(entries)
}

function makeEvent(zip: Uint8Array | null) {
  const file = zip
    ? { arrayBuffer: async () => zip.buffer, name: 'backup.zip' } as unknown as File
    : null
  ;(readFormData as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => file })
  return {}
}

describe('POST /api/admin/restore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(false)
  })

  it('restores valid yaml files from zip', async () => {
    const zip = makeZip({ 'services.yaml': '- name: Media', 'bookmarks.yaml': '- name: Links' })
    makeEvent(zip)
    const result = await (handler as (e: unknown) => Promise<{ ok: boolean; restored: string[] }>)({})
    expect(result.ok).toBe(true)
    expect(result.restored).toContain('services.yaml')
    expect(result.restored).toContain('bookmarks.yaml')
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2)
  })

  it('skips non-config files in the zip', async () => {
    const zip = makeZip({ 'services.yaml': 'data', 'image.png': 'binary' })
    makeEvent(zip)
    const result = await (handler as (e: unknown) => Promise<{ ok: boolean; restored: string[] }>)({})
    expect(result.restored).not.toContain('image.png')
    expect(result.restored).toContain('services.yaml')
  })

  it('rejects path traversal entries', async () => {
    const zip = makeZip({ '../evil.yaml': 'bad', 'settings.yaml': 'ok' })
    makeEvent(zip)
    const result = await (handler as (e: unknown) => Promise<{ ok: boolean; restored: string[] }>)({})
    expect(result.restored).not.toContain('../evil.yaml')
    expect(result.restored).toContain('settings.yaml')
  })

  it('backs up existing files before overwriting', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const zip = makeZip({ 'services.yaml': 'new data' })
    makeEvent(zip)
    await (handler as (e: unknown) => Promise<unknown>)({})
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      '/fake/config/services.yaml',
      '/fake/config/services.yaml.bak',
    )
  })

  it('does not backup when file does not exist yet', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const zip = makeZip({ 'services.yaml': 'data' })
    makeEvent(zip)
    await (handler as (e: unknown) => Promise<unknown>)({})
    expect(fs.copyFileSync).not.toHaveBeenCalled()
  })

  it('throws 400 when no file is uploaded', async () => {
    makeEvent(null)
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('No file uploaded')
  })

  it('throws 400 when zip contains no valid config files', async () => {
    const zip = makeZip({ 'photo.jpg': 'binary', 'readme.txt': 'text' })
    makeEvent(zip)
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow('no valid config files')
  })

  it('throws 400 for corrupt zip data', async () => {
    ;(readFormData as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => ({
        arrayBuffer: async () => new Uint8Array([0, 1, 2, 3]).buffer,
        name: 'bad.zip',
      }),
    })
    await expect(
      (handler as (e: unknown) => Promise<unknown>)({}),
    ).rejects.toThrow()
  })
})
