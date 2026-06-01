import { describe, it, expect } from 'vitest'
import { externalUrl } from '../shared/externalUrl'

type Service = { url?: string; healthcheck?: string; [key: string]: unknown }

function healthcheckPingUrl(service: Service): string | null {
  const hc = service.healthcheck as string | undefined
  if (hc === 'none' || hc === 'docker')
    return null
  const raw = hc && hc !== 'http' ? hc : (service.url as string | undefined)
  return raw ? externalUrl(raw) : null
}

describe('healthcheckPingUrl', () => {
  it('returns service URL when no healthcheck configured', () => {
    expect(healthcheckPingUrl({ url: 'http://sonarr' })).toBe('http://sonarr')
  })

  it('returns null when no URL and no healthcheck', () => {
    expect(healthcheckPingUrl({})).toBeNull()
  })

  it('returns null when healthcheck is none', () => {
    expect(healthcheckPingUrl({ url: 'http://sonarr', healthcheck: 'none' })).toBeNull()
  })

  it('returns null when healthcheck is docker', () => {
    expect(healthcheckPingUrl({ url: 'http://sonarr', healthcheck: 'docker' })).toBeNull()
  })

  it('returns service URL when healthcheck is http', () => {
    expect(healthcheckPingUrl({ url: 'http://sonarr', healthcheck: 'http' })).toBe('http://sonarr')
  })

  it('returns custom URL when healthcheck is a URL', () => {
    expect(healthcheckPingUrl({ url: 'http://sonarr', healthcheck: 'http://sonarr/health' })).toBe('http://sonarr/health')
  })

  it('returns custom URL even when service has no URL', () => {
    expect(healthcheckPingUrl({ healthcheck: 'http://health.example.com' })).toBe('http://health.example.com')
  })

  it('returns null for http healthcheck with no service URL', () => {
    expect(healthcheckPingUrl({ healthcheck: 'http' })).toBeNull()
  })

  it('normalizes a scheme-less service URL to http for the ping', () => {
    expect(healthcheckPingUrl({ url: '10.0.1.2:8200' })).toBe('http://10.0.1.2:8200')
  })

  it('normalizes a scheme-less custom healthcheck URL to http for the ping', () => {
    expect(healthcheckPingUrl({ url: 'http://sonarr', healthcheck: 'sonarr.local/health' })).toBe('http://sonarr.local/health')
  })
})
