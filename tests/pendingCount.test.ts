import { describe, it, expect } from 'vitest'
import { countListChanges } from '../app/utils/pendingCount'

type Item = { name: string; [k: string]: unknown }

describe('countListChanges', () => {
  it('returns 0 for identical lists', () => {
    const items = [{ name: 'a', url: 'x' }, { name: 'b', url: 'y' }]
    expect(countListChanges(items, JSON.parse(JSON.stringify(items)))).toBe(0)
  })

  it('counts a rename as 1 change, not 2', () => {
    const snap = [{ name: 'Sonarr', url: 'http://sonarr' }]
    const cur  = [{ name: 'Sonarr TV', url: 'http://sonarr' }]
    expect(countListChanges(snap, cur)).toBe(1)
  })

  it('counts a field edit as 1 change', () => {
    const snap = [{ name: 'a', url: 'old' }]
    const cur  = [{ name: 'a', url: 'new' }]
    expect(countListChanges(snap, cur)).toBe(1)
  })

  it('counts an added item', () => {
    const snap: Item[] = [{ name: 'a' }]
    const cur:  Item[] = [{ name: 'a' }, { name: 'b' }]
    expect(countListChanges(snap, cur)).toBe(1)
  })

  it('counts a removed item', () => {
    const snap: Item[] = [{ name: 'a' }, { name: 'b' }]
    const cur:  Item[] = [{ name: 'a' }]
    expect(countListChanges(snap, cur)).toBe(1)
  })

  it('counts multiple independent changes correctly', () => {
    const snap = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
    const cur  = [{ name: 'a' }, { name: 'B' }, { name: 'C' }]
    expect(countListChanges(snap, cur)).toBe(2)
  })

  it('returns 0 for two empty lists', () => {
    expect(countListChanges([], [])).toBe(0)
  })

  it('counts all items when snap is empty', () => {
    const cur = [{ name: 'a' }, { name: 'b' }]
    expect(countListChanges([], cur)).toBe(2)
  })

  it('counts all items when cur is empty', () => {
    const snap = [{ name: 'a' }, { name: 'b' }]
    expect(countListChanges(snap, [])).toBe(2)
  })

  it('both rename and edit in same item = 1 change', () => {
    const snap = [{ name: 'Radarr', url: 'http://old' }]
    const cur  = [{ name: 'Radarr Movies', url: 'http://new' }]
    expect(countListChanges(snap, cur)).toBe(1)
  })
})
