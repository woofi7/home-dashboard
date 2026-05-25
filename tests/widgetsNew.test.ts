import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAsf } from '../server/api/widget/asf.get'
import { fetchBeszel } from '../server/api/widget/beszel.get'
import { fetchUptimekuma } from '../server/api/widget/uptimekuma.get'
import { fetchRestic } from '../server/api/widget/restic.get'

vi.mock('../server/utils/widget-fields', () => ({
  getActiveFields: (_type: string, labels: string[]) => new Set(labels),
  getOrderedActiveFields: <T>(_type: string, allFields: T[]) => allFields,
}))

const fetch = vi.fn()
vi.stubGlobal('$fetch', fetch)

const mockReadFileSync = vi.fn()
vi.mock('node:fs', () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}))

beforeEach(() => {
  fetch.mockReset()
  mockReadFileSync.mockReset()
})

// ─── ASF ──────────────────────────────────────────────────────────────────────

describe('fetchAsf', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchAsf({ password: 'pw' })).toBeNull()
  })

  it('returns null when password is missing', async () => {
    expect(await fetchAsf({ url: 'http://asf' })).toBeNull()
  })

  it('returns correct fields', async () => {
    fetch.mockResolvedValueOnce({
      Result: {
        bot1: { IsConnectedAndLoggedOn: true,  CardsFarmer: { Farming: true,  CardsRemaining: 10, GamesRemaining: 2 } },
        bot2: { IsConnectedAndLoggedOn: true,  CardsFarmer: { Farming: false, CardsRemaining: 5,  GamesRemaining: 0 } },
        bot3: { IsConnectedAndLoggedOn: false, CardsFarmer: { Farming: false, CardsRemaining: 0,  GamesRemaining: 0 } },
      },
    })

    const result = await fetchAsf({ url: 'http://asf', password: 'pw' })
    expect(result?.fields).toEqual([
      { label: 'Bots',    value: 3 },
      { label: 'Online',  value: 2 },
      { label: 'Farming', value: 1 },
      { label: 'Cards',   value: 15 },
      { label: 'Games',   value: 2 },
    ])
  })

  it('uses Authentication header (not Bearer)', async () => {
    fetch.mockResolvedValueOnce({ Result: {} })
    await fetchAsf({ url: 'http://asf', password: 'secret' })
    expect(fetch).toHaveBeenCalledWith(
      'http://asf/Api/Bot/ASF',
      expect.objectContaining({ headers: { Authentication: 'secret' } }),
    )
  })

  it('strips trailing slash from url', async () => {
    fetch.mockResolvedValueOnce({ Result: {} })
    await fetchAsf({ url: 'http://asf/', password: 'pw' })
    expect(fetch).toHaveBeenCalledWith('http://asf/Api/Bot/ASF', expect.anything())
  })

  it('handles empty Result gracefully', async () => {
    fetch.mockResolvedValueOnce({ Result: {} })
    const result = await fetchAsf({ url: 'http://asf', password: 'pw' })
    expect(result?.fields).toEqual([
      { label: 'Bots',    value: 0 },
      { label: 'Online',  value: 0 },
      { label: 'Farming', value: 0 },
      { label: 'Cards',   value: 0 },
      { label: 'Games',   value: 0 },
    ])
  })
})

// ─── Beszel ───────────────────────────────────────────────────────────────────

describe('fetchBeszel', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchBeszel({ username: 'u', password: 'p' })).toBeNull()
  })

  it('returns null when username is missing', async () => {
    expect(await fetchBeszel({ url: 'http://beszel', password: 'p' })).toBeNull()
  })

  it('returns null when password is missing', async () => {
    expect(await fetchBeszel({ url: 'http://beszel', username: 'u' })).toBeNull()
  })

  it('returns correct fields', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        items: [
          { status: 'up',   info: { cpu: 20, mp: 40, dp: 10 } },
          { status: 'up',   info: { cpu: 60, mp: 80, dp: 20 } },
          { status: 'down', info: {} },
        ],
      })

    const result = await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(result?.fields).toEqual([
      { label: 'Systems', value: 3 },
      { label: 'Up',      value: 2 },
      { label: 'Down',    value: 1 },
      { label: 'Avg CPU', value: '40.0%' },
      { label: 'Avg Mem', value: '60.0%' },
    ])
  })

  it('falls back to superuser auth when user auth fails', async () => {
    fetch
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce({ token: 'admin-tok' })
      .mockResolvedValueOnce({ items: [] })

    await fetchBeszel({ url: 'http://beszel', username: 'admin', password: 'p' })

    expect(fetch).toHaveBeenNthCalledWith(1,
      'http://beszel/api/collections/users/auth-with-password',
      expect.anything(),
    )
    expect(fetch).toHaveBeenNthCalledWith(2,
      'http://beszel/api/collections/_superusers/auth-with-password',
      expect.anything(),
    )
  })

  it('sends Bearer token to systems endpoint', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'mytoken' })
      .mockResolvedValueOnce({ items: [] })

    await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(fetch).toHaveBeenCalledWith(
      'http://beszel/api/collections/systems/records?perPage=500',
      expect.objectContaining({ headers: { Authorization: 'Bearer mytoken' } }),
    )
  })

  it('parses info when stored as JSON string', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        items: [
          { status: 'up', info: JSON.stringify({ cpu: 50, mp: 70 }) },
        ],
      })

    const result = await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Avg CPU')?.value).toBe('50.0%')
  })

  it('shows dash for avg when no info values are present', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({ items: [{ status: 'up', info: {} }] })

    const result = await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Avg CPU')?.value).toBe('—')
  })

  it('does not count paused systems as down', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        items: [
          { status: 'up',     info: {} },
          { status: 'paused', info: {} },
          { status: 'down',   info: {} },
        ],
      })

    const result = await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Down')?.value).toBe(1)
  })
})

// ─── Uptime Kuma ──────────────────────────────────────────────────────────────

describe('fetchUptimekuma', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchUptimekuma({ username: 'u', password: 'p' })).toBeNull()
  })

  it('returns null when username is missing', async () => {
    expect(await fetchUptimekuma({ url: 'http://kuma', password: 'p' })).toBeNull()
  })

  it('returns null when password is missing', async () => {
    expect(await fetchUptimekuma({ url: 'http://kuma', username: 'u' })).toBeNull()
  })

  it('returns null when login returns no token', async () => {
    fetch.mockResolvedValueOnce({ token: '' })
    expect(await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })).toBeNull()
  })

  it('returns null when 2FA is required', async () => {
    fetch.mockResolvedValueOnce({ token: 'tok', tokenRequired: true })
    expect(await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })).toBeNull()
  })

  it('returns correct fields with monitors as object', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        monitors: {
          '1': { id: 1, name: 'Site A', active: true },
          '2': { id: 2, name: 'Site B', active: true },
          '3': { id: 3, name: 'Site C', active: false },
        },
      })
      .mockResolvedValueOnce({
        heartbeats: {
          '1': [{ status: 1, time: '2026-01-01T00:00:00Z' }],
          '2': [{ status: 0, time: '2026-01-01T01:00:00Z', msg: 'timeout' }],
        },
      })
      .mockResolvedValueOnce({
        uptimeList: { '1_24': 1.0, '2_24': 0.9 },
      })

    const result = await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })
    expect(result?.fields).toEqual([
      { label: 'Monitors',   value: 3 },
      { label: 'Up',         value: 1 },
      { label: 'Down',       value: 1 },
      { label: 'Paused',     value: 1 },
      { label: 'Uptime',     value: '95.0%' },
      { label: 'Last Down',  value: 'Site B' },
    ])
  })

  it('returns correct fields with monitors as array', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        monitors: [
          { id: 1, name: 'A', active: 1 },
          { id: 2, name: 'B', active: 0 },
        ],
      })
      .mockResolvedValueOnce({ heartbeats: { '1': [{ status: 1, time: '2026-01-01T00:00:00Z' }] } })
      .mockResolvedValueOnce({ uptimeList: { '1_24': 0.8 } })

    const result = await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Monitors')?.value).toBe(2)
    expect(result?.fields.find(f => f.label === 'Paused')?.value).toBe(1)
  })

  it('uses form-encoded login body', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({ monitors: [] })
      .mockResolvedValueOnce({ heartbeats: {} })
      .mockResolvedValueOnce({ uptimeList: {} })

    await fetchUptimekuma({ url: 'http://kuma', username: 'admin', password: 'secret' })
    expect(fetch).toHaveBeenNthCalledWith(1,
      'http://kuma/api/login/access-token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=admin&password=secret',
      }),
    )
  })

  it('falls back to counting active as up when heartbeat endpoint fails', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        monitors: [
          { id: 1, name: 'A', active: true },
          { id: 2, name: 'B', active: true },
        ],
      })
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ uptimeList: {} })

    const result = await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Up')?.value).toBe(2)
    expect(result?.fields.find(f => f.label === 'Down')?.value).toBe(0)
  })

  it('shows dash for uptime when uptime endpoint fails', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({ monitors: [{ id: 1, name: 'A', active: true }] })
      .mockResolvedValueOnce({ heartbeats: { '1': [{ status: 1, time: '2026-01-01T00:00:00Z' }] } })
      .mockRejectedValueOnce(new Error('500'))

    const result = await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Uptime')?.value).toBe('—')
  })

  it('tracks the most recently downed monitor', async () => {
    fetch
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({
        monitors: {
          '1': { id: 1, name: 'Old Down', active: true },
          '2': { id: 2, name: 'New Down', active: true },
        },
      })
      .mockResolvedValueOnce({
        heartbeats: {
          '1': [{ status: 0, time: '2026-01-01T00:00:00Z' }],
          '2': [{ status: 0, time: '2026-01-02T00:00:00Z' }],
        },
      })
      .mockResolvedValueOnce({ uptimeList: {} })

    const result = await fetchUptimekuma({ url: 'http://kuma', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Last Down')?.value).toBe('New Down')
  })
})

// ─── Restic ───────────────────────────────────────────────────────────────────

describe('fetchRestic', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchRestic({})).toBeNull()
  })

  it('reads from file when url does not start with http', async () => {
    const snapshots = [
      { id: 'abc', short_id: 'abc', time: new Date(Date.now() - 30 * 60_000).toISOString(), hostname: 'srv', paths: ['/data'] },
    ]
    mockReadFileSync.mockReturnValueOnce(JSON.stringify(snapshots))

    const result = await fetchRestic({ url: '/var/lib/restic/snapshots.json' })
    expect(mockReadFileSync).toHaveBeenCalledWith('/var/lib/restic/snapshots.json', 'utf-8')
    expect(fetch).not.toHaveBeenCalled()
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe(1)
  })

  it('fetches from HTTP when url starts with http://', async () => {
    const snapshots = [
      { id: 'abc', short_id: 'abc', time: new Date(Date.now() - 3600_000).toISOString(), hostname: 'srv', paths: ['/home'] },
    ]
    fetch.mockResolvedValueOnce(snapshots)

    const result = await fetchRestic({ url: 'http://example.com/snapshots.json' })
    expect(fetch).toHaveBeenCalledWith('http://example.com/snapshots.json')
    expect(mockReadFileSync).not.toHaveBeenCalled()
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe(1)
  })

  it('fetches from HTTP when url starts with https://', async () => {
    fetch.mockResolvedValueOnce([
      { id: 'x', short_id: 'x', time: new Date().toISOString(), hostname: 'h', paths: [] },
    ])
    await fetchRestic({ url: 'https://example.com/snapshots.json' })
    expect(fetch).toHaveBeenCalledWith('https://example.com/snapshots.json')
  })

  it('returns zero fields when snapshot list is empty', async () => {
    mockReadFileSync.mockReturnValueOnce('[]')
    const result = await fetchRestic({ url: '/path/to/snapshots.json' })
    expect(result?.fields).toEqual([
      { label: 'Snapshots',   value: 0 },
      { label: 'Last Backup', value: '—' },
      { label: 'Age',         value: '—' },
      { label: 'Hostname',    value: '—' },
      { label: 'Paths',       value: '—' },
    ])
  })

  it('picks the most recent snapshot when multiple exist', async () => {
    const snapshots = [
      { id: 'a', short_id: 'a', time: '2026-01-01T00:00:00Z', hostname: 'old', paths: ['/old'] },
      { id: 'b', short_id: 'b', time: '2026-06-01T00:00:00Z', hostname: 'new', paths: ['/new'] },
    ]
    mockReadFileSync.mockReturnValueOnce(JSON.stringify(snapshots))

    const result = await fetchRestic({ url: '/snap.json' })
    expect(result?.fields.find(f => f.label === 'Hostname')?.value).toBe('new')
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe(2)
  })

  it('joins multiple paths with comma', async () => {
    mockReadFileSync.mockReturnValueOnce(JSON.stringify([
      { id: 'a', short_id: 'a', time: new Date().toISOString(), hostname: 'h', paths: ['/data', '/home', '/etc'] },
    ]))

    const result = await fetchRestic({ url: '/snap.json' })
    expect(result?.fields.find(f => f.label === 'Paths')?.value).toBe('/data, /home, /etc')
  })

  it('shows dash for hostname and paths when absent', async () => {
    mockReadFileSync.mockReturnValueOnce(JSON.stringify([
      { id: 'a', short_id: 'a', time: new Date().toISOString() },
    ]))

    const result = await fetchRestic({ url: '/snap.json' })
    expect(result?.fields.find(f => f.label === 'Hostname')?.value).toBe('—')
    expect(result?.fields.find(f => f.label === 'Paths')?.value).toBe('—')
  })

  it('formats age in minutes for recent snapshots', async () => {
    const time = new Date(Date.now() - 25 * 60_000).toISOString()
    mockReadFileSync.mockReturnValueOnce(JSON.stringify([
      { id: 'a', short_id: 'a', time, hostname: 'h', paths: [] },
    ]))

    const result = await fetchRestic({ url: '/snap.json' })
    expect(result?.fields.find(f => f.label === 'Age')?.value).toBe('25m ago')
  })

  it('formats age in hours for snapshots between 1-24h old', async () => {
    const time = new Date(Date.now() - 5 * 3600_000).toISOString()
    mockReadFileSync.mockReturnValueOnce(JSON.stringify([
      { id: 'a', short_id: 'a', time, hostname: 'h', paths: [] },
    ]))

    const result = await fetchRestic({ url: '/snap.json' })
    expect(result?.fields.find(f => f.label === 'Age')?.value).toBe('5h ago')
  })

  it('formats age in days for snapshots older than 24h', async () => {
    const time = new Date(Date.now() - 3 * 86400_000).toISOString()
    mockReadFileSync.mockReturnValueOnce(JSON.stringify([
      { id: 'a', short_id: 'a', time, hostname: 'h', paths: [] },
    ]))

    const result = await fetchRestic({ url: '/snap.json' })
    expect(result?.fields.find(f => f.label === 'Age')?.value).toBe('3d ago')
  })
})
