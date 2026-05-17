import { describe, it, expect } from 'vitest'
import { resolveContainerState } from '../app/utils/dockerLookup'

const STATUS = {
  nas: {
    sonarr: { state: 'running', status: 'Up 2 days' },
    radarr: { state: 'exited', status: 'Exited (0) 1 hour ago' },
    'my-app': { state: 'running', status: 'Up 1 day' },
  },
  vps: {
    nginx: { state: 'running', status: 'Up 5 days' },
    sonarr: { state: 'exited', status: 'Exited (0) 3 hours ago' },
  },
}

describe('resolveContainerState — explicit server', () => {
  it('finds container in the specified server', () => {
    const result = resolveContainerState(STATUS, 'Sonarr', 'sonarr', 'nas')
    expect(result).toEqual({ state: 'running', status: 'Up 2 days' })
  })

  it('does not cross to another server when server is specified', () => {
    const result = resolveContainerState(STATUS, 'Sonarr', 'sonarr', 'vps')
    expect(result).toEqual({ state: 'exited', status: 'Exited (0) 3 hours ago' })
  })

  it('returns null when container not found in specified server', () => {
    const result = resolveContainerState(STATUS, 'Plex', 'plex', 'nas')
    expect(result).toBeNull()
  })

  it('returns null for an unknown server name', () => {
    const result = resolveContainerState(STATUS, 'Sonarr', 'sonarr', 'unknown')
    expect(result).toBeNull()
  })
})

describe('resolveContainerState — no server (search all)', () => {
  it('finds a container by explicit container name across all servers', () => {
    const result = resolveContainerState(STATUS, 'My Service', 'nginx')
    expect(result).toEqual({ state: 'running', status: 'Up 5 days' })
  })

  it('returns first match when container exists in multiple servers', () => {
    const result = resolveContainerState(STATUS, 'Sonarr', 'sonarr')
    expect(result).not.toBeNull()
    expect(['running', 'exited']).toContain(result?.state)
  })

  it('returns null when no container matches across any server', () => {
    const result = resolveContainerState(STATUS, 'Plex', 'plex')
    expect(result).toBeNull()
  })
})

describe('resolveContainerState — container name fallback from service name', () => {
  it('derives target from service name when container is undefined', () => {
    const result = resolveContainerState(STATUS, 'Sonarr')
    expect(result).not.toBeNull()
    expect(result?.state).toBeDefined()
  })

  it('lowercases and strips spaces from service name', () => {
    // 'My App' → 'myapp'; 'my-app' does not include 'myapp' and vice-versa → no match
    const result = resolveContainerState(STATUS, 'My App')
    expect(result).toBeNull()
  })

  it('matches when stripped name is a substring of the container name', () => {
    const status = { nas: { 'sonarr-tv': { state: 'running', status: 'Up' } } }
    // 'Sonarr' → 'sonarr'; 'sonarr-tv'.includes('sonarr') → true
    const result = resolveContainerState(status, 'Sonarr')
    expect(result).toEqual({ state: 'running', status: 'Up' })
  })

  it('returns null when service name does not match any container', () => {
    const result = resolveContainerState(STATUS, 'Plex')
    expect(result).toBeNull()
  })
})

describe('resolveContainerState — edge cases', () => {
  it('returns null when dockerStatus is empty', () => {
    expect(resolveContainerState({}, 'Sonarr', 'sonarr', 'nas')).toBeNull()
    expect(resolveContainerState({}, 'Sonarr', 'sonarr')).toBeNull()
  })

  it('partial match: target substring of container name', () => {
    const status = { local: { 'my-sonarr-instance': { state: 'running', status: 'Up' } } }
    const result = resolveContainerState(status, 'Sonarr')
    expect(result).toEqual({ state: 'running', status: 'Up' })
  })

  it('partial match: container name is substring of target → matches', () => {
    // 'plexmediaserver'.includes('plex') → true, so plex IS found
    const status = { local: { plex: { state: 'running', status: 'Up' } } }
    const result = resolveContainerState(status, 'Plex Media Server', 'plexmediaserver')
    expect(result).toEqual({ state: 'running', status: 'Up' })
  })
})
