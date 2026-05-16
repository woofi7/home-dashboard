import { describe, it, expect } from 'vitest'
import { formatBytes } from '../server/utils/formatBytes'

describe('formatBytes', () => {
  it('formats raw bytes', () => expect(formatBytes(0)).toBe('0 B'))
  it('formats bytes under 1 KB', () => expect(formatBytes(512)).toBe('512 B'))
  it('formats kilobytes', () => expect(formatBytes(1536)).toBe('1.5 KB'))
  it('formats megabytes', () => expect(formatBytes(2 * 1024 ** 2)).toBe('2.00 MB'))
  it('formats gigabytes', () => expect(formatBytes(3 * 1024 ** 3)).toBe('3.00 GB'))
  it('appends /s suffix for per-second values', () => expect(formatBytes(1024, true)).toBe('1.0 KB/s'))
  it('appends /s on GB too', () => expect(formatBytes(2 * 1024 ** 3, true)).toBe('2.00 GB/s'))
})
