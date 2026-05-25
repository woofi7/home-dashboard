import { describe, it, expect } from 'vitest'
import { recoverOrphanedItems } from '../server/utils/guardConfig'

type Item = { name: string; [key: string]: unknown }
type Group = { name: string; services?: Item[]; bookmarks?: Item[] }

function run(raw: Group[], incoming: Group[], key: string) {
  return recoverOrphanedItems(raw, incoming, key) as Group[]
}

describe('recoverOrphanedItems', () => {
  it('returns incoming unchanged when no items are orphaned', () => {
    const raw = [{ name: 'G1', services: [{ name: 'A' }, { name: 'B' }] }]
    const incoming = [{ name: 'G1', services: [{ name: 'A' }, { name: 'B' }] }]
    expect(run(raw, incoming, 'services')).toEqual(incoming)
  })

  it('recovers item missing from incoming back to its original group', () => {
    const raw = [{ name: 'G1', services: [{ name: 'A' }, { name: 'B' }] }]
    const incoming = [{ name: 'G1', services: [{ name: 'A' }] }]
    const result = run(raw, incoming, 'services')
    const names = result[0].services!.map(s => s.name)
    expect(names).toContain('B')
  })

  it('recovers item to first group when original group was deleted', () => {
    const raw = [
      { name: 'G1', services: [{ name: 'A' }] },
      { name: 'G2', services: [{ name: 'B' }] },
    ]
    // G1 is gone, B moved to G2 but A was accidentally lost
    const incoming = [{ name: 'G2', services: [{ name: 'B' }] }]
    const result = run(raw, incoming, 'services')
    expect(result[0].services!.map(s => s.name)).toContain('A')
  })

  it('handles items that moved between groups without losing any', () => {
    const raw = [
      { name: 'G1', services: [{ name: 'A' }, { name: 'B' }] },
      { name: 'G2', services: [{ name: 'C' }] },
    ]
    // B moved from G1 to G2
    const incoming = [
      { name: 'G1', services: [{ name: 'A' }] },
      { name: 'G2', services: [{ name: 'C' }, { name: 'B' }] },
    ]
    const result = run(raw, incoming, 'services')
    const allNames = result.flatMap(g => g.services!.map(s => s.name))
    expect(allNames.sort()).toEqual(['A', 'B', 'C'])
  })

  it('recovers multiple orphaned items', () => {
    const raw = [{ name: 'G1', services: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }]
    const incoming = [{ name: 'G1', services: [] }]
    const result = run(raw, incoming, 'services')
    const names = result[0].services!.map(s => s.name)
    expect(names).toContain('A')
    expect(names).toContain('B')
    expect(names).toContain('C')
  })

  it('works with bookmarks key', () => {
    const raw = [{ name: 'Bk1', bookmarks: [{ name: 'X', url: 'http://x' }, { name: 'Y', url: 'http://y' }] }]
    const incoming = [{ name: 'Bk1', bookmarks: [{ name: 'X', url: 'http://x' }] }]
    const result = run(raw, incoming, 'bookmarks')
    const names = result[0].bookmarks!.map(b => b.name)
    expect(names).toContain('Y')
  })

  it('returns incoming unchanged when raw is empty', () => {
    const incoming = [{ name: 'G1', services: [{ name: 'A' }] }]
    expect(run([], incoming, 'services')).toEqual(incoming)
  })

  it('simulates exact user bug flow: create group, move services, delete old, save', () => {
    // Raw YAML before the save
    const raw = [
      { name: 'OldGroup', services: [{ name: 'Sonarr', apiKey: 'secret123' }, { name: 'Radarr', apiKey: 'abc' }] },
    ]
    // Frontend bug: services were moved to NewGroup but OldGroup still shows them in state.
    // User then deletes OldGroup. Resulting payload has NewGroup but Sonarr/Radarr are lost.
    const incoming = [
      { name: 'NewGroup', services: [] },
    ]
    const result = run(raw, incoming, 'services')
    const allNames = result.flatMap(g => g.services!.map(s => s.name))
    expect(allNames).toContain('Sonarr')
    expect(allNames).toContain('Radarr')
  })
})
