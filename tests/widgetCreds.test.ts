import { describe, it, expect } from 'vitest'
import { envVarName, parseEnvRef } from '../app/utils/widgetCreds'

describe('envVarName', () => {
  it('unraid apiKey → UNRAID_API_KEY', () => {
    expect(envVarName('unraid', 'apiKey')).toBe('UNRAID_API_KEY')
  })

  it('homeassistant apiKey → HOMEASSISTANT_API_KEY', () => {
    expect(envVarName('homeassistant', 'apiKey')).toBe('HOMEASSISTANT_API_KEY')
  })

  it('qbittorrent password → QBITTORRENT_PASSWORD', () => {
    expect(envVarName('qbittorrent', 'password')).toBe('QBITTORRENT_PASSWORD')
  })

  it('qbittorrent username → QBITTORRENT_USERNAME', () => {
    expect(envVarName('qbittorrent', 'username')).toBe('QBITTORRENT_USERNAME')
  })

  it('pihole password → PIHOLE_PASSWORD', () => {
    expect(envVarName('pihole', 'password')).toBe('PIHOLE_PASSWORD')
  })

  it('audiobookshelf apiKey → AUDIOBOOKSHELF_API_KEY', () => {
    expect(envVarName('audiobookshelf', 'apiKey')).toBe('AUDIOBOOKSHELF_API_KEY')
  })

  it('handles hyphens in type name', () => {
    expect(envVarName('my-service', 'apiKey')).toBe('MY_SERVICE_API_KEY')
  })

  it('handles multiple separators', () => {
    expect(envVarName('some--thing', 'apiKey')).toBe('SOME_THING_API_KEY')
  })
})

describe('parseEnvRef', () => {
  it('returns variable name for ${VAR} pattern', () => {
    expect(parseEnvRef('${UNRAID_API_KEY}')).toBe('UNRAID_API_KEY')
  })

  it('returns null for plain string', () => {
    expect(parseEnvRef('actual-api-key-value')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseEnvRef('')).toBeNull()
  })

  it('returns null for non-string', () => {
    expect(parseEnvRef(null)).toBeNull()
    expect(parseEnvRef(undefined)).toBeNull()
    expect(parseEnvRef(42)).toBeNull()
  })

  it('returns null for partial match (not full string)', () => {
    expect(parseEnvRef('prefix-${VAR}')).toBeNull()
    expect(parseEnvRef('${VAR}-suffix')).toBeNull()
  })

  it('returns null for malformed ref', () => {
    expect(parseEnvRef('${}')).toBeNull()
    expect(parseEnvRef('$VAR')).toBeNull()
  })

  it('handles var name with underscores and numbers', () => {
    expect(parseEnvRef('${MY_VAR_123}')).toBe('MY_VAR_123')
  })
})
