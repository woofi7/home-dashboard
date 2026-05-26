import { describe, it, expect } from 'vitest'

type Service = { url?: string; healthcheck?: string; [key: string]: unknown }

function healthcheckPingUrl(service: Service): string | null {
  const hc = service.healthcheck as string | undefined
  if (hc === 'none' || hc === 'docker')
    return null
  if (hc && hc !== 'http')
    return hc
  return (service.url as string | undefined) ?? null
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
})
