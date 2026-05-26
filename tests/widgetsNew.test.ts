import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAsf } from '../server/api/widget/asf.get'
import { fetchBackrest } from '../server/api/widget/backrest.get'
import { fetchBeszel } from '../server/api/widget/beszel.get'
import { fetchUptimekuma } from '../server/api/widget/uptimekuma.get'
import { fetchRestic } from '../server/api/widget/restic.get'
import { fetchTugtainer } from '../server/api/widget/tugtainer.get'

vi.mock('../server/utils/widget-fields', () => ({
  getActiveFields: (_type: string, labels: string[]) => new Set(labels),
  getOrderedActiveFields: <T>(_type: string, allFields: T[]) => allFields,
}))

const fetchDollar = vi.fn()
vi.stubGlobal('$fetch', fetchDollar)

// Native fetch mock — used by fetchUptimekuma (returns a Response-like object)
const nativeFetch = vi.fn()
vi.stubGlobal('fetch', nativeFetch)

function mockPrometheusResponse(text: string, ok = true) {
  nativeFetch.mockResolvedValueOnce({ ok, text: async () => text })
}

const mockReadFileSync = vi.fn()
vi.mock('node:fs', () => ({
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}))

beforeEach(() => {
  fetchDollar.mockReset()
  nativeFetch.mockReset()
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
    fetchDollar.mockResolvedValueOnce({
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
    fetchDollar.mockResolvedValueOnce({ Result: {} })
    await fetchAsf({ url: 'http://asf', password: 'secret' })
    expect(fetchDollar).toHaveBeenCalledWith(
      'http://asf/Api/Bot/ASF',
      expect.objectContaining({ headers: { Authentication: 'secret' } }),
    )
  })

  it('strips trailing slash from url', async () => {
    fetchDollar.mockResolvedValueOnce({ Result: {} })
    await fetchAsf({ url: 'http://asf/', password: 'pw' })
    expect(fetchDollar).toHaveBeenCalledWith('http://asf/Api/Bot/ASF', expect.anything())
  })

  it('handles empty Result gracefully', async () => {
    fetchDollar.mockResolvedValueOnce({ Result: {} })
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
    fetchDollar
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
    fetchDollar
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce({ token: 'admin-tok' })
      .mockResolvedValueOnce({ items: [] })

    await fetchBeszel({ url: 'http://beszel', username: 'admin', password: 'p' })

    expect(fetchDollar).toHaveBeenNthCalledWith(1,
      'http://beszel/api/collections/users/auth-with-password',
      expect.anything(),
    )
    expect(fetchDollar).toHaveBeenNthCalledWith(2,
      'http://beszel/api/collections/_superusers/auth-with-password',
      expect.anything(),
    )
  })

  it('sends Bearer token to systems endpoint', async () => {
    fetchDollar
      .mockResolvedValueOnce({ token: 'mytoken' })
      .mockResolvedValueOnce({ items: [] })

    await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(fetchDollar).toHaveBeenCalledWith(
      'http://beszel/api/collections/systems/records?perPage=500',
      expect.objectContaining({ headers: { Authorization: 'Bearer mytoken' } }),
    )
  })

  it('parses info when stored as JSON string', async () => {
    fetchDollar
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
    fetchDollar
      .mockResolvedValueOnce({ token: 'tok' })
      .mockResolvedValueOnce({ items: [{ status: 'up', info: {} }] })

    const result = await fetchBeszel({ url: 'http://beszel', username: 'u', password: 'p' })
    expect(result?.fields.find(f => f.label === 'Avg CPU')?.value).toBe('—')
  })

  it('does not count paused systems as down', async () => {
    fetchDollar
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

const PROMETHEUS_RESPONSE = `# HELP monitor_status Monitor Status
# TYPE monitor_status gauge
monitor_status{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",monitor_hostname="",monitor_port=""} 1
monitor_status{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",monitor_hostname="",monitor_port=""} 0
monitor_status{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",monitor_hostname="",monitor_port=""} 1
# HELP monitor_uptime_ratio Monitor Uptime Ratio
# TYPE monitor_uptime_ratio gauge
monitor_uptime_ratio{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",window="1d"} 1
monitor_uptime_ratio{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",window="1d"} 0.8
monitor_uptime_ratio{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",window="1d"} 0.9
monitor_uptime_ratio{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",window="30d"} 0.99
monitor_uptime_ratio{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",window="30d"} 0.95
monitor_uptime_ratio{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",window="30d"} 0.97
monitor_uptime_ratio{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",window="365d"} 0.999
monitor_uptime_ratio{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",window="365d"} 0.98
monitor_uptime_ratio{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",window="365d"} 0.99
# HELP monitor_response_time_seconds Avg response time
# TYPE monitor_response_time_seconds gauge
monitor_response_time_seconds{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",monitor_hostname="",monitor_port="",window="1d"} 0.1
monitor_response_time_seconds{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",monitor_hostname="",monitor_port="",window="1d"} 0.2
monitor_response_time_seconds{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",monitor_hostname="",monitor_port="",window="1d"} 0.3
# HELP monitor_cert_is_valid Cert valid
# TYPE monitor_cert_is_valid gauge
monitor_cert_is_valid{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",monitor_hostname="",monitor_port=""} 1
monitor_cert_is_valid{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",monitor_hostname="",monitor_port=""} 0
monitor_cert_is_valid{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",monitor_hostname="",monitor_port=""} 1
# HELP monitor_cert_days_remaining Cert days remaining
# TYPE monitor_cert_days_remaining gauge
monitor_cert_days_remaining{monitor_name="Site A",monitor_type="http",monitor_url="https://a.example.com",monitor_hostname="",monitor_port=""} 90
monitor_cert_days_remaining{monitor_name="Site B",monitor_type="http",monitor_url="https://b.example.com",monitor_hostname="",monitor_port=""} 5
monitor_cert_days_remaining{monitor_name="Site C",monitor_type="http",monitor_url="https://c.example.com",monitor_hostname="",monitor_port=""} 45
`

describe('fetchUptimekuma', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchUptimekuma({ apiKey: 'key' })).toBeNull()
  })

  it('returns null when apiKey is missing', async () => {
    expect(await fetchUptimekuma({ url: 'http://kuma' })).toBeNull()
  })

  it('fetches /metrics with Basic authorization (API key as password)', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    await fetchUptimekuma({ url: 'http://kuma', apiKey: 'mykey' })
    const expectedToken = Buffer.from(':mykey').toString('base64')
    expect(nativeFetch).toHaveBeenCalledWith(
      'http://kuma/metrics',
      expect.objectContaining({ headers: { Authorization: `Basic ${expectedToken}` } }),
    )
  })

  it('strips trailing slash from url before appending /metrics', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    await fetchUptimekuma({ url: 'http://kuma/', apiKey: 'k' })
    expect(nativeFetch).toHaveBeenCalledWith('http://kuma/metrics', expect.anything())
  })

  it('returns null when response is not ok (e.g. 401)', async () => {
    mockPrometheusResponse('Unauthorized', false)
    expect(await fetchUptimekuma({ url: 'http://kuma', apiKey: 'bad' })).toBeNull()
  })

  it('counts monitors, up, and down correctly', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.find(f => f.label === 'Monitors')?.value).toBe(3)
    expect(result?.fields.find(f => f.label === 'Up')?.value).toBe(2)
    expect(result?.fields.find(f => f.label === 'Down')?.value).toBe(1)
  })

  it('lists names of down monitors in Down Services field', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.find(f => f.label === 'Down Services')?.value).toBe('Site B')
  })

  it('shows dash for Down Services when all monitors are up', async () => {
    mockPrometheusResponse(`
monitor_status{monitor_name="A",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 1
monitor_status{monitor_name="B",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 1
`)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.find(f => f.label === 'Down Services')?.value).toBe('-')
  })

  it('counts PENDING and MAINTENANCE separately', async () => {
    mockPrometheusResponse(`
monitor_status{monitor_name="A",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 1
monitor_status{monitor_name="B",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 2
monitor_status{monitor_name="C",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 3
monitor_status{monitor_name="D",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 3
`)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.find(f => f.label === 'Monitors')?.value).toBe(4)
    expect(result?.fields.find(f => f.label === 'Up')?.value).toBe(1)
    expect(result?.fields.find(f => f.label === 'Down')?.value).toBe(0)
    expect(result?.fields.find(f => f.label === 'Pending')?.value).toBe(1)
    expect(result?.fields.find(f => f.label === 'Maintenance')?.value).toBe(2)
  })

  it('computes average 24h uptime from monitor_uptime_ratio{window="1d"} only', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    // (1 + 0.8 + 0.9) / 3 = 0.9 -> 90.0%
    expect(result?.fields.find(f => f.label === 'Uptime 1d')?.value).toBe('90.0%')
  })

  it('computes average 30d uptime from monitor_uptime_ratio{window="30d"}', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    // (0.99 + 0.95 + 0.97) / 3 = 0.97 -> 97.0%
    expect(result?.fields.find(f => f.label === 'Uptime 30d')?.value).toBe('97.0%')
  })

  it('computes average 1y uptime from monitor_uptime_ratio{window="365d"}', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    // (0.999 + 0.98 + 0.99) / 3 = 0.98966... -> 99.0%
    expect(result?.fields.find(f => f.label === 'Uptime 1y')?.value).toBe('99.0%')
  })

  it('shows dash for uptime when no uptime metrics are present', async () => {
    mockPrometheusResponse(`
monitor_status{monitor_name="A",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 1
`)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.find(f => f.label === 'Uptime 1d')?.value).toBe('-')
  })

  it('computes avg ping from monitor_response_time_seconds{window="1d"} in ms', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    // (0.1 + 0.2 + 0.3) / 3 = 0.2 s = 200 ms
    expect(result?.fields.find(f => f.label === 'Avg Ping')?.value).toBe('200 ms')
  })

  it('counts valid certs', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    // Site A and Site C valid, Site B invalid
    expect(result?.fields.find(f => f.label === 'Cert Valid')?.value).toBe(2)
  })

  it('reports minimum cert expiry days', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    // min(90, 5, 45) = 5
    expect(result?.fields.find(f => f.label === 'Min Cert Expiry')?.value).toBe('5 d')
  })

  it('shows dash for cert fields when no cert metrics are present', async () => {
    mockPrometheusResponse(`
monitor_status{monitor_name="A",monitor_type="http",monitor_url="",monitor_hostname="",monitor_port=""} 1
`)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.find(f => f.label === 'Cert Valid')?.value).toBe('-')
    expect(result?.fields.find(f => f.label === 'Min Cert Expiry')?.value).toBe('-')
  })

  it('returns all twelve fields in order', async () => {
    mockPrometheusResponse(PROMETHEUS_RESPONSE)
    const result = await fetchUptimekuma({ url: 'http://kuma', apiKey: 'k' })
    expect(result?.fields.map(f => f.label)).toEqual([
      'Monitors', 'Up', 'Down', 'Down Services', 'Pending', 'Maintenance',
      'Uptime 1d', 'Uptime 30d', 'Uptime 1y',
      'Avg Ping', 'Cert Valid', 'Min Cert Expiry',
    ])
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
    expect(fetchDollar).not.toHaveBeenCalled()
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe(1)
  })

  it('fetches from HTTP when url starts with http://', async () => {
    const snapshots = [
      { id: 'abc', short_id: 'abc', time: new Date(Date.now() - 3600_000).toISOString(), hostname: 'srv', paths: ['/home'] },
    ]
    fetchDollar.mockResolvedValueOnce(snapshots)

    const result = await fetchRestic({ url: 'http://example.com/snapshots.json' })
    expect(fetchDollar).toHaveBeenCalledWith('http://example.com/snapshots.json')
    expect(mockReadFileSync).not.toHaveBeenCalled()
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe(1)
  })

  it('fetches from HTTP when url starts with https://', async () => {
    fetchDollar.mockResolvedValueOnce([
      { id: 'x', short_id: 'x', time: new Date().toISOString(), hostname: 'h', paths: [] },
    ])
    await fetchRestic({ url: 'https://example.com/snapshots.json' })
    expect(fetchDollar).toHaveBeenCalledWith('https://example.com/snapshots.json')
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

// ─── Backrest ─────────────────────────────────────────────────────────────────

const BACKREST_GUID = 'abc123def456abc123def456abc123def456abc123def456abc123def456ab12'

function makeConfig(repos: Array<{ id: string; guid?: string }> = [{ id: 'local', guid: BACKREST_GUID }]) {
  return { repos }
}

function makeDashboard(overrides: { timestampMs?: string; status?: string } = {}) {
  return {
    repoSummaries: [{
      id: 'local',
      recentBackups: {
        timestampMs: [overrides.timestampMs ?? String(Date.now() - 5 * 60 * 1000)],
        status: [overrides.status ?? 'STATUS_SUCCESS'],
      },
    }],
  }
}

function makeOpsResponse(totalSize = '2048', snapshotCount = '3') {
  return {
    operations: [{
      operationStats: {
        stats: { totalSize, snapshotCount },
      },
    }],
  }
}

describe('fetchBackrest', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchBackrest({})).toBeNull()
  })

  it('returns None configured when no repos', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig([]))
      .mockResolvedValueOnce({ repoSummaries: [] })
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields[0]?.value).toBe('None configured')
  })

  it('returns last backup, snapshots and disk size fields for single repo', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeOpsResponse())
    const result = await fetchBackrest({ url: 'http://backrest' })
    const labels = result?.fields.map(f => f.label)
    expect(labels).toEqual(['Last backup', 'Snapshots', 'Disk size'])
  })

  it('prefixes fields with repo id for multiple repos', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig([
        { id: 'local', guid: BACKREST_GUID },
        { id: 'offsite', guid: BACKREST_GUID.replace(/a/g, 'b') },
      ]))
      .mockResolvedValueOnce({
        repoSummaries: [
          { id: 'local', recentBackups: { timestampMs: [String(Date.now() - 60_000)], status: ['STATUS_SUCCESS'] } },
          { id: 'offsite', recentBackups: { timestampMs: [String(Date.now() - 120_000)], status: ['STATUS_SUCCESS'] } },
        ],
      })
      .mockResolvedValueOnce(makeOpsResponse())
      .mockResolvedValueOnce(makeOpsResponse('4096', '5'))
    const result = await fetchBackrest({ url: 'http://backrest' })
    const labels = result?.fields.map(f => f.label)
    expect(labels).toContain('local: Last backup')
    expect(labels).toContain('offsite: Snapshots')
  })

  it('shows last backup age in minutes', async () => {
    const twoMinsAgo = String(Date.now() - 2 * 60 * 1000)
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard({ timestampMs: twoMinsAgo }))
      .mockResolvedValueOnce(makeOpsResponse())
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields.find(f => f.label === 'Last backup')?.value).toMatch(/^2m ago$/)
  })

  it('marks last backup as failed when status is not success', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard({ status: 'STATUS_ERROR' }))
      .mockResolvedValueOnce(makeOpsResponse())
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields.find(f => f.label === 'Last backup')?.value).toContain('(failed)')
  })

  it('shows Never when no recent backups in dashboard', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce({ repoSummaries: [{ id: 'local', recentBackups: {} }] })
      .mockResolvedValueOnce(makeOpsResponse())
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields.find(f => f.label === 'Last backup')?.value).toBe('Never')
  })

  it('shows snapshot count from stats operation', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeOpsResponse('2048', '7'))
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe('7')
  })

  it('shows formatted disk size from stats operation', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeOpsResponse(String(1024 * 1024)))
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields.find(f => f.label === 'Disk size')?.value).toBe('1.00 MB')
  })

  it('shows dash when no stats operation has been run', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce({ operations: [] })
    const result = await fetchBackrest({ url: 'http://backrest' })
    expect(result?.fields.find(f => f.label === 'Disk size')?.value).toBe('—')
    expect(result?.fields.find(f => f.label === 'Snapshots')?.value).toBe('—')
  })

  it('sends Basic auth header when username and password provided', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeOpsResponse())
    await fetchBackrest({ url: 'http://backrest', username: 'admin', password: 'secret' })
    const configCall = fetchDollar.mock.calls[0]
    const headers = configCall[1]?.headers as Record<string, string>
    expect(headers['Authorization']).toMatch(/^Basic /)
    const decoded = Buffer.from(headers['Authorization'].replace('Basic ', ''), 'base64').toString()
    expect(decoded).toBe('admin:secret')
  })

  it('calls GetConfig and GetSummaryDashboard', async () => {
    fetchDollar
      .mockResolvedValueOnce(makeConfig())
      .mockResolvedValueOnce(makeDashboard())
      .mockResolvedValueOnce(makeOpsResponse())
    await fetchBackrest({ url: 'http://backrest' })
    const urls = fetchDollar.mock.calls.map((c: unknown[]) => c[0])
    expect(urls).toContain('http://backrest/v1.Backrest/GetConfig')
    expect(urls).toContain('http://backrest/v1.Backrest/GetSummaryDashboard')
    expect(urls).toContain('http://backrest/v1.Backrest/GetOperations')
  })
})

// ─── Tugtainer ────────────────────────────────────────────────────────────────

type TugtainerSummary = {
  host_id: number
  host_name: string
  host_enabled: boolean
  total_containers: number
  by_update_available: Record<string, number>
  total_images: number
  unused_images: number
  dangling_images: number
}

function makeTugSummary(overrides: Partial<TugtainerSummary> = {}): TugtainerSummary {
  return {
    host_id: 1,
    host_name: 'Roger',
    host_enabled: true,
    total_containers: 34,
    by_update_available: { 'true': 14, 'false': 20 },
    total_images: 76,
    unused_images: 42,
    dangling_images: 8,
    ...overrides,
  }
}

function mockTugLogin(token = 'testtoken') {
  fetchDollar.mockImplementationOnce(async (_url: string, opts?: { onResponse?: (ctx: unknown) => void }) => {
    opts?.onResponse?.({
      response: {
        headers: { get: (h: string) => h === 'set-cookie' ? `access_token=${token}; HttpOnly` : '' },
      },
    })
  })
}

describe('fetchTugtainer', () => {
  it('returns null when url is missing', async () => {
    expect(await fetchTugtainer({ password: 'pw' })).toBeNull()
  })

  it('returns null when password is missing', async () => {
    expect(await fetchTugtainer({ url: 'http://tug' })).toBeNull()
  })

  it('returns updates, total containers, unused and dangling images', async () => {
    mockTugLogin()
    fetchDollar.mockResolvedValueOnce([makeTugSummary()])
    const result = await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    const labels = result?.fields.map(f => f.label)
    expect(labels).toEqual(['Updates available', 'Total containers', 'Unused images', 'Dangling images'])
  })

  it('uses correct values for single host', async () => {
    mockTugLogin()
    fetchDollar.mockResolvedValueOnce([makeTugSummary()])
    const result = await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    expect(result?.fields.find(f => f.label === 'Updates available')?.value).toBe(14)
    expect(result?.fields.find(f => f.label === 'Total containers')?.value).toBe(34)
    expect(result?.fields.find(f => f.label === 'Unused images')?.value).toBe(42)
    expect(result?.fields.find(f => f.label === 'Dangling images')?.value).toBe(8)
  })

  it('prefixes updates with host name for multiple hosts', async () => {
    mockTugLogin()
    fetchDollar.mockResolvedValueOnce([
      makeTugSummary({ host_id: 1, host_name: 'Roger', by_update_available: { 'true': 14 } }),
      makeTugSummary({ host_id: 2, host_name: 'woofi7.com', by_update_available: { 'true': 10 }, total_containers: 17, unused_images: 12, dangling_images: 0 }),
    ])
    const result = await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    const labels = result?.fields.map(f => f.label)
    expect(labels).toContain('Roger - Updates available')
    expect(labels).toContain('woofi7.com - Updates available')
    expect(labels).toContain('Total containers')
  })

  it('aggregates totals across hosts', async () => {
    mockTugLogin()
    fetchDollar.mockResolvedValueOnce([
      makeTugSummary({ total_containers: 34, unused_images: 42, dangling_images: 8 }),
      makeTugSummary({ host_id: 2, host_name: 'woofi7.com', total_containers: 17, unused_images: 12, dangling_images: 0 }),
    ])
    const result = await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    expect(result?.fields.find(f => f.label === 'Total containers')?.value).toBe(51)
    expect(result?.fields.find(f => f.label === 'Unused images')?.value).toBe(54)
    expect(result?.fields.find(f => f.label === 'Dangling images')?.value).toBe(8)
  })

  it('skips disabled hosts', async () => {
    mockTugLogin()
    fetchDollar.mockResolvedValueOnce([
      makeTugSummary({ host_name: 'Roger' }),
      makeTugSummary({ host_id: 2, host_name: 'Disabled', host_enabled: false, by_update_available: { 'true': 99 } }),
    ])
    const result = await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    const labels = result?.fields.map(f => f.label)
    expect(labels).not.toContain('Disabled - Updates available')
    expect(labels).toContain('Updates available')
  })

  it('passes the access_token cookie to the summary request', async () => {
    mockTugLogin('mytoken123')
    fetchDollar.mockResolvedValueOnce([makeTugSummary()])
    await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    const summaryCall = fetchDollar.mock.calls[1]
    expect(summaryCall[1]?.headers?.Cookie).toBe('access_token=mytoken123')
  })

  it('calls the correct login and summary endpoints', async () => {
    mockTugLogin()
    fetchDollar.mockResolvedValueOnce([makeTugSummary()])
    await fetchTugtainer({ url: 'http://tug', password: 'pw' })
    const urls = fetchDollar.mock.calls.map((c: unknown[]) => c[0])
    expect(urls).toContain('http://tug/api/auth/password/login')
    expect(urls).toContain('http://tug/api/public/summary')
  })
})
