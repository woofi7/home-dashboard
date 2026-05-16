import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveJsonPath } from '../server/utils/jsonpath'

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })

const data = {
  a: { b: { c: 42 } },
  arr: [10, 20, 30],
  users: [
    { name: 'alice', active: 'true', score: 5 },
    { name: 'bob',   active: 'false', score: 3 },
    { name: 'carol', active: 'true', score: 7 },
  ],
}

describe('resolveJsonPath', () => {
  it('resolves a nested property path', () => {
    expect(resolveJsonPath(data, '$.a.b.c')).toBe(42)
  })

  it('resolves an array index', () => {
    expect(resolveJsonPath(data, '$.arr[1]')).toBe(20)
  })

  it('returns array length', () => {
    expect(resolveJsonPath(data, '$.arr.length')).toBe(3)
  })

  it('returns null for a missing path', () => {
    expect(resolveJsonPath(data, '$.x.y.z')).toBeNull()
  })

  it('returns the literal string for non-$ paths', () => {
    expect(resolveJsonPath(data, 'literal')).toBe('literal')
  })

  it('filters array by field equality', () => {
    const result = resolveJsonPath(data, '$.users[active=true]') as unknown[]
    expect(result).toHaveLength(2)
  })

  it('counts filtered items with .length', () => {
    expect(resolveJsonPath(data, '$.users[active=true].length')).toBe(2)
  })

  it('plucks a field from filtered results', () => {
    expect(resolveJsonPath(data, '$.users[active=true].score')).toEqual([5, 7])
  })

  it('sums a plucked field with the sum: prefix', () => {
    expect(resolveJsonPath(data, 'sum:$.users[active=true].score')).toBe(12)
  })

  it('returns null when intermediate value is null', () => {
    expect(resolveJsonPath({ a: null }, '$.a.b')).toBeNull()
  })
})
