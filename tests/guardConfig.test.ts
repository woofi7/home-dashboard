import { describe, it, expect } from 'vitest'
import { recoverOrphanedItems } from '../server/utils/guardConfig'

type Item = { name: string; [key: string]: unknown }
type Group = { name: string; services?: Item[]; bookmarks?: Item[] }

function run(raw: Group[], incoming: Group[], key: string, deleted: string[] = []) {
  return recoverOrphanedItems(raw, incoming, key, deleted) as Group[]
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

  it('does not recover items from an intentionally deleted group', () => {
    const raw = [
      { name: 'G1', services: [{ name: 'A' }] },
      { name: 'G2', services: [{ name: 'B' }] },
    ]
    // G1 was deleted by the user — A must not be recovered into G2
    const incoming = [{ name: 'G2', services: [{ name: 'B' }] }]
    const result = run(raw, incoming, 'services')
    expect(result[0].services!.map(s => s.name)).not.toContain('A')
    expect(result).toEqual(incoming)
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

  it('user flow: create group, move services, delete old — services in new group are kept', () => {
    // Raw: OldGroup has Sonarr and Radarr
    const raw = [
      { name: 'OldGroup', services: [{ name: 'Sonarr', apiKey: 'secret123' }, { name: 'Radarr', apiKey: 'abc' }] },
    ]
    // User properly moved services to NewGroup, then deleted OldGroup.
    // Incoming: NewGroup has both services, OldGroup is gone.
    const incoming = [
      { name: 'NewGroup', services: [{ name: 'Sonarr' }, { name: 'Radarr' }] },
    ]
    const result = run(raw, incoming, 'services')
    const allNames = result.flatMap(g => g.services!.map(s => s.name))
    expect(allNames).toContain('Sonarr')
    expect(allNames).toContain('Radarr')
  })

  it('user flow: delete group — items from deleted group are not recovered', () => {
    // Raw: Services group has Overseerr and Sonarr
    const raw = [
      { name: 'Services', services: [{ name: 'Overseerr' }, { name: 'Sonarr' }] },
      { name: 'Media', services: [{ name: 'Plex' }] },
    ]
    // User deleted Services group entirely. Only Media remains.
    const incoming = [
      { name: 'Media', services: [{ name: 'Plex' }] },
    ]
    const result = run(raw, incoming, 'services')
    const allNames = result.flatMap(g => g.services!.map(s => s.name))
    expect(allNames).not.toContain('Overseerr')
    expect(allNames).not.toContain('Sonarr')
    expect(allNames).toContain('Plex')
  })

  it('does not recover an item the user explicitly deleted from a surviving group', () => {
    // Raw: Services group has Home Assistant and Sonarr
    const raw = [{ name: 'Services', services: [{ name: 'Home Assistant' }, { name: 'Sonarr' }] }]
    // User deleted Home Assistant; the group survives. It is listed in `deleted`.
    const incoming = [{ name: 'Services', services: [{ name: 'Sonarr' }] }]
    const result = run(raw, incoming, 'services', ['Home Assistant'])
    expect(result[0].services!.map(s => s.name)).toEqual(['Sonarr'])
  })

  it('still recovers an accidentally dropped item even when another item was deleted', () => {
    const raw = [{ name: 'G1', services: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }]
    // A was deleted on purpose; B vanished due to a desync and must come back.
    const incoming = [{ name: 'G1', services: [{ name: 'C' }] }]
    const result = run(raw, incoming, 'services', ['A'])
    const names = result[0].services!.map(s => s.name)
    expect(names).toContain('B')
    expect(names).not.toContain('A')
  })

  it('recovers item accidentally lost from a surviving group (the original move bug)', () => {
    // Raw: two groups exist
    const raw = [
      { name: 'G1', services: [{ name: 'A' }, { name: 'B' }] },
      { name: 'G2', services: [] },
    ]
    // Frontend bug caused B to be dropped entirely — both groups survive
    const incoming = [
      { name: 'G1', services: [{ name: 'A' }] },
      { name: 'G2', services: [] },
    ]
    const result = run(raw, incoming, 'services')
    const g1Names = result.find(g => g.name === 'G1')!.services!.map(s => s.name)
    expect(g1Names).toContain('B')
  })
})
