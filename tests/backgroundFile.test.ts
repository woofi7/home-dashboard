import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}))

vi.mock('../server/utils/config', () => ({
  getConfigDir: () => '/config',
}))

const responseHeaders: Record<string, string> = {}
vi.stubGlobal('setResponseHeader', (_event: unknown, key: string, value: string) => {
  responseHeaders[key] = value
})

import handler from '../server/api/background-file.get'

beforeEach(() => {
  mockExistsSync.mockReset()
  mockReadFileSync.mockReset()
  Object.keys(responseHeaders).forEach(k => delete responseHeaders[k])
})

describe('background-file.get', () => {
  it('throws 404 when no uploaded file exists', () => {
    mockExistsSync.mockReturnValue(false)
    expect(() => handler(null as never)).toThrow('404')
  })

  it('serves jpg file with correct content-type', async () => {
    const buf = Buffer.from('fake jpg')
    mockExistsSync.mockImplementation((p: string) => p.endsWith('.jpg'))
    mockReadFileSync.mockReturnValue(buf)
    const result = await handler(null as never)
    expect(result).toBe(buf)
    expect(responseHeaders['Content-Type']).toBe('image/jpeg')
    expect(responseHeaders['Cache-Control']).toBe('no-cache')
  })

  it('serves png file with correct content-type', async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('.png'))
    mockReadFileSync.mockReturnValue(Buffer.from('png'))
    await handler(null as never)
    expect(responseHeaders['Content-Type']).toBe('image/png')
  })

  it('serves webp file with correct content-type', async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('.webp'))
    mockReadFileSync.mockReturnValue(Buffer.from('webp'))
    await handler(null as never)
    expect(responseHeaders['Content-Type']).toBe('image/webp')
  })

  it('serves gif file with correct content-type', async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('.gif'))
    mockReadFileSync.mockReturnValue(Buffer.from('gif'))
    await handler(null as never)
    expect(responseHeaders['Content-Type']).toBe('image/gif')
  })

  it('prefers jpg over other extensions', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(Buffer.from('x'))
    await handler(null as never)
    expect(responseHeaders['Content-Type']).toBe('image/jpeg')
  })

  it('reads from the config dir', async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('.jpg'))
    mockReadFileSync.mockReturnValue(Buffer.from('x'))
    await handler(null as never)
    expect(mockExistsSync).toHaveBeenCalledWith(expect.stringContaining('/config'))
    expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('/config'))
  })

  it('skips extensions where file does not exist', async () => {
    mockExistsSync.mockImplementation((p: string) => p.endsWith('.webp'))
    mockReadFileSync.mockReturnValue(Buffer.from('x'))
    await handler(null as never)
    const checkedPaths = mockExistsSync.mock.calls.map(([p]) => p as string)
    const jpgChecked = checkedPaths.some(p => p.endsWith('.jpg'))
    expect(jpgChecked).toBe(true)
    expect(responseHeaders['Content-Type']).toBe('image/webp')
  })
})
