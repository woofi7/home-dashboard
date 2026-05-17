import { vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('getQuery', () => ({}))
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => new Error(`${statusCode}: ${message}`))
