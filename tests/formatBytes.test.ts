import { describe, it, expect } from 'vitest'
import { formatBytes, formatKilobytes, formatDuration, formatSpeed } from '../server/utils/formatBytes'

describe('formatBytes', () => {
  it('formats raw bytes', () => expect(formatBytes(0)).toBe('0 B'))
  it('formats bytes under 1 KB', () => expect(formatBytes(512)).toBe('512 B'))
  it('formats kilobytes', () => expect(formatBytes(1536)).toBe('1.5 KB'))
  it('formats megabytes', () => expect(formatBytes(2 * 1024 ** 2)).toBe('2.00 MB'))
  it('formats gigabytes', () => expect(formatBytes(3 * 1024 ** 3)).toBe('3.00 GB'))
  it('formats terabytes', () => expect(formatBytes(2 * 1024 ** 4)).toBe('2.00 TB'))
  it('appends /s suffix for per-second values', () => expect(formatBytes(1024, true)).toBe('1.0 KB/s'))
  it('appends /s on TB too', () => expect(formatBytes(2 * 1024 ** 4, true)).toBe('2.00 TB/s'))
})

describe('formatKilobytes', () => {
  it('formats KB', () => expect(formatKilobytes(512)).toBe('512 KB'))
  it('formats MB', () => expect(formatKilobytes(2048)).toBe('2.0 MB'))
  it('formats GB', () => expect(formatKilobytes(2 * 1024 ** 2)).toBe('2.0 GB'))
  it('formats TB', () => expect(formatKilobytes(1024 ** 3)).toBe('1.0 TB'))
  it('accepts string input', () => expect(formatKilobytes('1024')).toBe('1.0 MB'))
})

describe('formatDuration', () => {
  it('formats hours under 24', () => expect(formatDuration(7200)).toBe('2 hrs'))
  it('formats fractional days', () => expect(formatDuration(36 * 3600)).toBe('1.5 days'))
  it('formats zero', () => expect(formatDuration(0)).toBe('0 hrs'))
})

describe('formatSpeed', () => {
  it('formats speed without limit', () => expect(formatSpeed(1024)).toBe('1.0 KB/s'))
  it('formats speed with limit', () => expect(formatSpeed(1024, 2048)).toBe('1.0 KB/s / 2.0 KB/s'))
  it('omits limit when zero', () => expect(formatSpeed(1024, 0)).toBe('1.0 KB/s'))
})
