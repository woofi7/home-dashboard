import { describe, it, expect } from 'vitest'
import { preserveCredentials } from '../server/utils/credentialMerge'
import type { ServiceGroup } from '../server/types'

function makeRaw(overrides: Record<string, unknown> = {}): ServiceGroup[] {
  return [{
    name: 'Homelab',
    services: [
      { name: 'qBittorrent', url: 'http://localhost:8080', type: 'qbittorrent', username: 'admin', password: 'secret123' },
      { name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: 'rawkey' },
      { name: 'Pi-hole', url: 'http://pi', type: 'pihole', password: 'pipass' },
      { name: 'NoAuth', url: 'http://none', type: 'tdarr', ...overrides },
    ],
  }]
}

function makeIncoming(overrides: Partial<Record<string, unknown>> = {}): ServiceGroup[] {
  return [{
    name: 'Homelab',
    services: [
      // Simulates config.get.ts output: credential fields stripped
      { name: 'qBittorrent', url: 'http://localhost:8080', type: 'qbittorrent' },
      { name: 'Unraid', url: 'http://nas', type: 'unraid' },
      { name: 'Pi-hole', url: 'http://pi', type: 'pihole' },
      { name: 'NoAuth', url: 'http://none', type: 'tdarr', ...overrides },
    ],
  }]
}

describe('preserveCredentials', () => {
  it('restores password for unedited service where key is absent', () => {
    const result = preserveCredentials(makeRaw(), makeIncoming())
    const qbt = result[0].services.find(s => s.name === 'qBittorrent')!
    expect(qbt.password).toBe('secret123')
    expect(qbt.username).toBe('admin')
  })

  it('restores apiKey for unedited service where key is absent', () => {
    const result = preserveCredentials(makeRaw(), makeIncoming())
    const unraid = result[0].services.find(s => s.name === 'Unraid')!
    expect(unraid.apiKey).toBe('rawkey')
  })

  it('restores password-only credential (pihole)', () => {
    const result = preserveCredentials(makeRaw(), makeIncoming())
    const pihole = result[0].services.find(s => s.name === 'Pi-hole')!
    expect(pihole.password).toBe('pipass')
  })

  it('preserves incoming safe-field value when non-empty (e.g. changed URL)', () => {
    const incoming: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas-new', type: 'unraid' }],
    }]
    const raw: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: 'oldkey' }],
    }]
    const result = preserveCredentials(raw, incoming)
    expect(result[0].services[0].url).toBe('http://nas-new')
    expect(result[0].services[0].apiKey).toBe('oldkey')
  })

  it('keeps env var reference in incoming', () => {
    const incoming: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: '${UNRAID_API_KEY}' }],
    }]
    const raw: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: 'oldkey' }],
    }]
    const result = preserveCredentials(raw, incoming)
    expect(result[0].services[0].apiKey).toBe('${UNRAID_API_KEY}')
  })

  it('restores credentials when service is moved to a different group (source group kept)', () => {
    // Sonarr was in "Media", user moved it to "Arr". Both groups remain.
    const raw: ServiceGroup[] = [
      {
        name: 'Media',
        services: [{ name: 'Sonarr', url: 'http://sonarr', type: 'sonarr', apiKey: 'secret' }],
      },
      { name: 'Arr', services: [] },
    ]
    const incoming: ServiceGroup[] = [
      { name: 'Media', services: [] },
      { name: 'Arr', services: [{ name: 'Sonarr', url: 'http://sonarr', type: 'sonarr' }] },
    ]
    const result = preserveCredentials(raw, incoming)
    const sonarr = result.flatMap(g => g.services).find(s => s.name === 'Sonarr')!
    expect(sonarr.apiKey).toBe('secret')
  })

  it('restores credentials after create-group / move / delete-old / save flow', () => {
    // Exact user-reported flow:
    // 1. Raw YAML has Media with Sonarr + Radarr (credentialled)
    // 2. User creates new "Arr" group (not yet in YAML)
    // 3. User moves Sonarr and Radarr to "Arr"
    // 4. User deletes "Media" (so it is absent from incoming)
    // 5. Save sends reorderGroups with only [Arr (Sonarr, Radarr, no creds)]
    const raw: ServiceGroup[] = [
      {
        name: 'Media',
        services: [
          { name: 'Sonarr', url: 'http://sonarr', type: 'sonarr', apiKey: 'sonarr-key' },
          { name: 'Radarr', url: 'http://radarr', type: 'radarr', apiKey: 'radarr-key' },
        ],
      },
    ]
    const incoming: ServiceGroup[] = [
      {
        name: 'Arr',
        services: [
          { name: 'Sonarr', url: 'http://sonarr', type: 'sonarr' },
          { name: 'Radarr', url: 'http://radarr', type: 'radarr' },
        ],
      },
    ]
    const result = preserveCredentials(raw, incoming)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Arr')
    const sonarr = result[0].services.find(s => s.name === 'Sonarr')!
    const radarr = result[0].services.find(s => s.name === 'Radarr')!
    expect(sonarr.apiKey).toBe('sonarr-key')
    expect(radarr.apiKey).toBe('radarr-key')
  })

  it('restores non-credential fields (e.g. docker server) across group move', () => {
    const raw: ServiceGroup[] = [
      {
        name: 'Docker',
        services: [{ name: 'Nginx', url: 'http://nginx', type: '', container: 'nginx', server: 'nas' }],
      },
      { name: 'Web', services: [] },
    ]
    const incoming: ServiceGroup[] = [
      { name: 'Docker', services: [] },
      { name: 'Web', services: [{ name: 'Nginx', url: 'http://nginx', type: '', container: 'nginx' }] },
    ]
    const result = preserveCredentials(raw, incoming)
    const nginx = result.flatMap(g => g.services).find(s => s.name === 'Nginx')!
    expect(nginx.server).toBe('nas')
  })

  it('passes through new services not in raw', () => {
    const incoming: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'NewService', url: 'http://new', type: 'sonarr', apiKey: 'fresh' }],
    }]
    const raw: ServiceGroup[] = [{ name: 'Homelab', services: [] }]
    const result = preserveCredentials(raw, incoming)
    expect(result[0].services[0].apiKey).toBe('fresh')
  })

  it('passes through new groups not in raw', () => {
    const incoming: ServiceGroup[] = [{ name: 'NewGroup', services: [{ name: 'X', url: 'http://x' }] }]
    const result = preserveCredentials([], incoming)
    expect(result[0].name).toBe('NewGroup')
  })

  it('does not mutate inputs', () => {
    const raw = makeRaw()
    const incoming = makeIncoming()
    const rawSnap = JSON.parse(JSON.stringify(raw))
    const inSnap = JSON.parse(JSON.stringify(incoming))
    preserveCredentials(raw, incoming)
    expect(raw).toEqual(rawSnap)
    expect(incoming).toEqual(inSnap)
  })

  it('preserves all non-credential fields from incoming unchanged', () => {
    const incoming = makeIncoming()
    const result = preserveCredentials(makeRaw(), incoming)
    const svc = result[0].services.find(s => s.name === 'Unraid')!
    expect(svc.url).toBe('http://nas')
    expect(svc.type).toBe('unraid')
  })
})
