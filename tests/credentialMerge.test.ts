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

  it('keeps user-entered value when non-empty', () => {
    const incoming: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: 'newkey' }],
    }]
    const raw: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: 'oldkey' }],
    }]
    const result = preserveCredentials(raw, incoming)
    expect(result[0].services[0].apiKey).toBe('newkey')
  })

  it('keeps env var reference (non-empty string)', () => {
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

  it('restores when incoming value is explicit empty string', () => {
    const incoming: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: '' }],
    }]
    const raw: ServiceGroup[] = [{
      name: 'Homelab',
      services: [{ name: 'Unraid', url: 'http://nas', type: 'unraid', apiKey: 'existingkey' }],
    }]
    const result = preserveCredentials(raw, incoming)
    expect(result[0].services[0].apiKey).toBe('existingkey')
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
