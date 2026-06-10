import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#server/utils/adminAuth', () => ({ assertAuth: vi.fn() }))
vi.mock('#server/utils/config', () => ({ getConfigDir: vi.fn(() => '/tmp/cfg') }))

const writeFileSync = vi.fn()
vi.mock('node:fs', () => ({ writeFileSync: (...a: unknown[]) => writeFileSync(...a) }))

vi.stubGlobal('readMultipartFormData', vi.fn())

import handler from '#server/api/admin/background-upload.post'

const run = () => (handler as (e: unknown) => Promise<unknown>)({})
const multipart = vi.mocked(globalThis.readMultipartFormData as () => Promise<unknown>)

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const GIF = Buffer.from('GIF89a-rest-of-image')
const SVG = Buffer.from('<svg onload="alert(1)"></svg>')

beforeEach(() => {
  writeFileSync.mockReset()
  multipart.mockReset()
})

describe('POST /api/admin/background-upload', () => {
  it('writes a .png for real PNG bytes regardless of the filename', async () => {
    multipart.mockResolvedValue([{ name: 'file', data: PNG, filename: 'evil.svg', type: 'image/svg+xml' }])
    await run()
    expect(writeFileSync).toHaveBeenCalledWith('/tmp/cfg/background-upload.png', PNG)
  })

  it('writes a .jpg for real JPEG bytes even if the filename says .html', async () => {
    multipart.mockResolvedValue([{ name: 'file', data: JPG, filename: 'x.html', type: 'text/html' }])
    await run()
    expect(writeFileSync).toHaveBeenCalledWith('/tmp/cfg/background-upload.jpg', JPG)
  })

  it('accepts GIF magic bytes', async () => {
    multipart.mockResolvedValue([{ name: 'file', data: GIF, filename: 'a.gif', type: 'image/gif' }])
    await run()
    expect(writeFileSync).toHaveBeenCalledWith('/tmp/cfg/background-upload.gif', GIF)
  })

  it('rejects non-image content even when the MIME claims image/png', async () => {
    multipart.mockResolvedValue([{ name: 'file', data: SVG, filename: 'x.png', type: 'image/png' }])
    await expect(run()).rejects.toThrow('Invalid file type')
    expect(writeFileSync).not.toHaveBeenCalled()
  })

  it('rejects when no file is present', async () => {
    multipart.mockResolvedValue([])
    await expect(run()).rejects.toThrow('No file uploaded')
  })
})
